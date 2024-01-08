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
import { unbundleObject, TTSObject as SaveFileObject } from "@tts-tools/savefile";

import { DiagnosticCategory, FormatDiagnosticsHost, formatDiagnostics } from "typescript";
import configuration from "./configuration";
import { bundleLua, bundleXml, runTstl, unbundleLua, unbundleXml } from "./io/bundle";
import { getOutputFileUri, getOutputPath, getTstlPath, readOutputFile, writeOutputFile } from "./io/files";
import { LoadedObject, ObjectFile, ScriptData } from "./model/objectData";
import { Plugin } from "./plugin";
import { TTSObjectTreeProvider } from "./view/ttsObjectTreeProvider";
import {
  EditorMessage,
  MessageFormat,
  RequestEditorMessage,
  RequestObjectMessage,
  WriteContentMessag as WriteContentMessage,
} from "./message";
import { selectObject } from "./interaction/selectObject";

const defaultPolyFills = ["messageBridge", "object", "write"];

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
  public executeCode = async <T = void>(
    script: string,
    polyFills: string[] = defaultPolyFills,
    parameters: Record<string, string> = {}
  ) => {
    let completeScript = "";

    for (const polyFill of polyFills) {
      let content = await this.plugin.fileHandler.readExtensionFile(`polyFill/${polyFill}.lua`);
      for (const [name, value] of Object.entries(parameters)) {
        content = content.replace(`$\{${name}\}`, value);
      }
      completeScript += content + "\n\n";
    }
    completeScript += script;

    console.log(completeScript);

    return this.api.executeLuaCodeAndReturn(completeScript) as T;
  };

  public executeMacro = async (name: string, object?: LoadedObject) => {
    const command = await this.plugin.fileHandler.readExtensionFile(`macro/${name}.lua`);
    const parameters: Record<string, string> = {};

    const polyFills = ["messageBridge", "write"];
    if (!object) {
      polyFills.push("object");
    } else {
      console.log(object);
      polyFills.push("objectResolved");
      parameters.guid = object.guid;
    }

    this.executeCode(command, polyFills, parameters);
  };

  /**
   * Sends a custom structured object.
   *
   * @param object - Table to be sent to game
   */
  public async customMessage(object: EditorMessage) {
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

  private onCustomMessage = async (customMessage: CustomMessage) => {
    const message = customMessage.customMessage as RequestEditorMessage;

    this.plugin.debug(`recieved onCustomMessage ${JSON.stringify(message, null, 2)}`);

    switch (message.type) {
      case "object":
        this.handleObjectMessage(message);
        break;
      case "write":
        this.handleWriteMessage(message);
        break;
    }
  };

  private handleObjectMessage = async (message: RequestObjectMessage) => {
    const object = await selectObject(this.plugin, {
      title: message.title,
      includeGlobal: message.withGlobal,
    });
    if (object) {
      this.customMessage({
        type: "object",
        guid: object.guid,
      });
    }
  };

  private handleWriteMessage = async (message: WriteContentMessage) => {
    const content = this.formatContent(message.content, message.format);
    if (message.name) {
      let fileName = message.name;
      let file;
      if (message.object) {
        const object = this.plugin.getLoadedObject(message.object);
        if (!object) {
          window.showErrorMessage(`Requested to write file for object ${message.object}, but it wasn't loaded.`);
          return;
        }
        file = await this.plugin.fileHandler.writeOutputFile(`${object.fileName}.${fileName}`, content);
      } else {
        file = await this.plugin.fileHandler.writeWorkspaceFile(fileName, content);
      }

      window.showTextDocument(file);
    } else {
      workspace.openTextDocument({ content: content });
    }
  };

  private formatContent = (message: string, format: MessageFormat = "auto"): string => {
    if (format === "none") {
      return message;
    }

    try {
      const parsed = JSON.parse(message);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return message;
    }
  };

  private clearOutputPath = async () => {
    const outputPath = getOutputPath();
    await workspace.fs.delete(outputPath, { recursive: true });
  };

  private getObjectData = async (guid: string) => {
    const command = `
local obj = getObjectFromGUID("${guid}")
if obj and not obj.isDestroyed() then
  return obj.getJSON()
end

return {}
`;

    const data = await this.executeCode<string>(command);
    const parsed = JSON.parse(data) as SaveFileObject;
    const unbundled = unbundleObject(parsed);
    return unbundled;
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

    for (const file of scriptStates.map(toFileInfo)) {
      writeScriptFiles(file, file.script, "lua");

      if (file.ui) {
        writeScriptFiles(file, file.ui, "xml");
      }

      if (file.guid === "-1") {
        this.plugin.setLoadedObject({
          isGlobal: true,
          guid: file.guid,
          name: file.name,
          fileName: file.fileName,
          hasUi: file.ui !== undefined,
        });
      } else {
        const data = await this.getObjectData(file.guid);
        this.plugin.setLoadedObject({
          isGlobal: false,
          guid: file.guid,
          name: file.name,
          fileName: file.fileName,
          hasUi: file.ui !== undefined,
          data: data,
        });
        writeOutputFile(`${file.fileName}.data.json`, JSON.stringify(data, null, 2));
      }
    }

    this.view.refresh();
  };

  private createScripts = async (bundled: boolean) => {
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
