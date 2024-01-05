import ExternalEditorApi, {
  CustomMessage,
  ErrorMessage,
  IncomingJsonObject,
  LoadingANewGame,
  ObjectCreated,
  OutgoingJsonObject,
  PrintDebugMessage,
  PushingNewObject,
} from "@matanlurey/tts-editor";
import { Range, window, workspace } from "vscode";

import { DiagnosticCategory, FormatDiagnosticsHost, formatDiagnostics } from "typescript";
import configuration from "./configuration";
import { bundleLua, bundleXml, runTstl, unbundleLua, unbundleXml } from "./io/bundle";
import { getOutputFileUri, getOutputPath, getTstlPath, readOutputFile, writeOutputFile } from "./io/files";
import { ObjectFile, ScriptData } from "./model/objectData";
import { Plugin } from "./plugin";
import { TTSObjectTreeProvider } from "./view/ttsObjectTreeProvider";

export class TTSAdapter {
  private api: ExternalEditorApi;
  private plugin: Plugin;
  private view: TTSObjectTreeProvider;

  public constructor(plugin: Plugin, view: TTSObjectTreeProvider) {
    this.api = new ExternalEditorApi();
    this.plugin = plugin;
    this.view = view;

    this.initExternalEditorApi();
  }

  /**
   * Retrieves scripts from currently open game.
   */
  public getObjects = async () => {
    this.plugin.startProgress("Getting object scripts");
    this.api.getLuaScripts();
  };

  /**
   * Sends the bundled scripts to TTS
   */
  public saveAndPlay = async (bundled: boolean = false) => {
    try {
      await saveAllFiles();

      const { scripts, hasErrors } = await this.createScripts(bundled);
      if (!hasErrors) {
        this.plugin.startProgress("Sending scripts to TTS");
        this.api.saveAndPlay(scripts);
      }
    } catch (e: any) {
      this.plugin.error(`${e}`);
    }
  };

  /**
   * Executes the given Lua script in TTS.
   *
   * @param script the Lua script to execute
   */
  public executeCode = async <T = void>(script: string) => {
    return this.api.executeLuaCodeAndReturn(script) as T;
  };

  /**
   * Sends a custom structured object.
   *
   * @param object - Table to be sent to game
   */
  public async customMessage(object: any) {
    return this.api.customMessage(object);
  }

  private initExternalEditorApi = () => {
    this.api.on("loadingANewGame", this.onLoadGame.bind(this));
    this.api.on("pushingNewObject", this.onPushObject.bind(this));
    this.api.on("objectCreated", this.onObjectCreated.bind(this));
    this.api.on("printDebugMessage", this.onPrintDebugMessage.bind(this));
    this.api.on("errorMessage", this.onErrorMessage.bind(this));
    this.api.on("customMessage", this.onCustomMessage.bind(this));
    this.api.listen();
  };

  private onLoadGame = async (message: LoadingANewGame) => {
    this.plugin.debug("recieved onLoadGame");
    await this.clearOutputPath();
    this.plugin.resetLoadedObjects();
    this.readFilesFromTTS(message.scriptStates);
  };

  private onPushObject = async (message: PushingNewObject) => {
    this.plugin.debug(`recieved onPushObject ${message.messageID}`);
    this.readFilesFromTTS(message.scriptStates, true);
  };

  private onObjectCreated = async (message: ObjectCreated) => {
    this.plugin.debug(`recieved onObjectCreated ${message.guid}`);
  };

  private onPrintDebugMessage = async (message: PrintDebugMessage) => {
    this.plugin.info(message.message);
  };

  private onErrorMessage = async (message: ErrorMessage) => {
    this.plugin.info(`${message.guid} ${message.errorMessagePrefix}`);

    const action = await window.showErrorMessage(`${message.errorMessagePrefix}`, "Go To Error");
    if (!action) {
      return;
    }

    const object = this.plugin.getLoadedObject(message.guid);
    if (!object) {
      return;
    }

    const fileUri = getOutputFileUri(`${object.fileName}.lua`, true);
    let selection: Range | undefined = undefined;
    const rangeExpression = /.*:\((\d+),(\d+)-(\d+)\):/;
    const range = message.errorMessagePrefix.match(rangeExpression);

    if (range) {
      const [, line, start, end] = range;
      const lineNumber = Number(line) - 1;
      selection = new Range(lineNumber, Number(start), lineNumber, Number(end));
    }

    window.showTextDocument(fileUri, {
      selection: selection,
    });
  };

  private onCustomMessage = async (message: CustomMessage) => {
    this.plugin.debug(`recieved onCustomMessage ${message.customMessage}`);
  };

  private clearOutputPath = async () => {
    const outputPath = getOutputPath();
    await workspace.fs.delete(outputPath, { recursive: true });
  };

  private readFilesFromTTS = async (scriptStates: IncomingJsonObject[], openFiles?: boolean) => {
    this.plugin.setStatus(`Recieved ${scriptStates.length} scripts`);

    const writeScriptFiles = async (file: ObjectFile, script: ScriptData, extension: string) => {
      const fileName = `${file.fileName}.${extension}`;
      const baseFile = await writeOutputFile(fileName, script.content);
      const writtenFile = writeOutputFile(fileName, script.bundled, true);
      if (openFiles) {
        writtenFile.then(() => window.showTextDocument(baseFile));
      }
    };

    scriptStates.map(toFileInfo).forEach(async (file) => {
      this.plugin.setLoadedObject({
        guid: file.guid,
        name: file.name,
        fileName: file.fileName,
        hasUi: file.ui !== undefined,
        isGlobal: file.guid === "-1",
      });
      writeScriptFiles(file, file.script, "lua");

      if (file.ui) {
        writeScriptFiles(file, file.ui, "xml");
      }
    });

    this.view.refresh();
  };

  private createScripts = async (bundled: boolean) => {
    const directory = getOutputPath(bundled);
    const scripts = new Map<string, OutgoingJsonObject>();

    const includePathsLua = configuration.luaIncludePaths();
    const includePathXml = configuration.xmlIncludePath();
    this.plugin.debug(`Using Lua include paths ${includePathsLua}`);
    this.plugin.debug(`Using XML include path ${includePathXml}`);

    if (configuration.tstlEnalbed() && !bundled) {
      if (!this.runTstl()) {
        return {
          scripts: [],
          hasErrors: true,
        };
      }
    }

    let hasErrors: boolean = false;

    for (const object of this.plugin.getLoadedObjects()) {
      try {
        this.plugin.debug(`Reading object files ${object.fileName}`);
        const luaFile = await readOutputFile(`${object.fileName}.lua`, bundled);
        const xmlFile = await readOutputFile(`${object.fileName}.xml`, bundled);

        let lua: string = luaFile ?? "";
        let xml: string = xmlFile ?? "";
        if (luaFile && !bundled) {
          this.plugin.debug(`Found lua for ${object.guid}`);
          lua = await bundleLua(luaFile, includePathsLua);
        }
        if (xmlFile && !bundled) {
          this.plugin.debug(`Found xml for ${object.guid}`);
          xml = await bundleXml(xmlFile, includePathXml);
        }

        scripts.set(object.guid, {
          guid: object.guid,
          script: lua,
          ui: xml,
        });
      } catch (error: any) {
        window.showErrorMessage(error.message);
        console.error(error.stack);
        hasErrors = true;
      }
    }

    return {
      scripts: Array.from(scripts.values()),
      hasErrors: hasErrors,
    };
  };

  private runTstl = (): boolean => {
    let hasErrors = false;
    const path = getTstlPath();
    this.plugin.startProgress(`Running Typescript to Lua`);
    const result = runTstl(path);

    const errors = result.diagnostics.filter((d) => d.category === DiagnosticCategory.Error);
    const warnings = result.diagnostics.filter((d) => d.category === DiagnosticCategory.Warning);

    const showLog = (option?: string) => {
      if (option) {
        this.plugin.showOutput();
      }
    };

    if (errors.length > 0) {
      hasErrors = true;
      window
        .showErrorMessage("There were errors while running TSTL. Check the log for more information", "Show Log")
        .then(showLog);
    }
    if (warnings.length > 0) {
      window
        .showWarningMessage("There were warnings while running TSTL. Check the log for more information", "Show Log")
        .then(showLog);
    }

    const host: FormatDiagnosticsHost = {
      getCurrentDirectory: () => getOutputPath().toString(),
      getCanonicalFileName: (fileName: string) => fileName,
      getNewLine: () => "\n",
    };

    const output = formatDiagnostics(result.diagnostics, host);
    if (output.length > 0) {
      this.plugin.info(output);
    }
    this.plugin.endProgress();

    return !hasErrors;
  };
}
const toFileInfo = (object: IncomingJsonObject): ObjectFile => {
  const baseName = object.name.replace(/([":<>/\\|?*])/g, "");
  const fileName = `${baseName}.${object.guid}`;

  const ui = object.ui
    ? {
        bundled: object.ui,
        content: unbundleXml(object.ui),
      }
    : undefined;

  return {
    guid: object.guid,
    name: object.name,
    fileName: fileName,
    script: {
      bundled: object.script,
      content: getUnbundledLua(object.script),
    },
    ui: ui,
  };
};

const getUnbundledLua = (script: string) => {
  try {
    return unbundleLua(script);
  } catch (e) {
    console.error(e);
    return script;
  }
};

const saveAllFiles = async () => {
  try {
    await workspace.saveAll(false);
  } catch (reason: any) {
    throw new Error(`Unable to save opened files.\nDetail: ${reason}`);
  }
};
