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
import { posix } from "path";
import { Range, Uri, window, workspace } from "vscode";

import { DiagnosticCategory, FormatDiagnosticsHost, formatDiagnostics } from "typescript";
import configuration from "./configuration";
import { bundleLua, bundleXml, runTstl, unbundleLua, unbundleXml } from "./io/bundle";
import { FileInfo, readWorkspaceFiles, writeWorkspaceFile } from "./io/files";
import { Plugin } from "./plugin";

export class TTSAdapter {
  private api: ExternalEditorApi;
  private plugin: Plugin;
  private objectPaths: Map<string, string> = new Map();

  public constructor(plugin: Plugin) {
    this.api = new ExternalEditorApi();
    this.plugin = plugin;

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
  public saveAndPlay = async () => {
    try {
      await saveAllFiles();

      const outputPath = this.getOutputPath();
      const files = await readWorkspaceFiles(outputPath);
      const { scripts, hasErrors } = await this.createScripts(files, outputPath);
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
  public executeCode = async (script: string) => {
    return this.api.executeLuaCode(script);
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
    this.plugin.endProgress();
    await this.clearOutputPath();
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

    const file = await this.getBundledFileName(message.guid);
    if (!file) {
      return;
    }

    let selection: Range | undefined = undefined;
    const rangeExpression = /.*:\((\d+),(\d+)-(\d+)\):/;
    const range = message.errorMessagePrefix.match(rangeExpression);

    if (range) {
      const [, line, start, end] = range;
      const lineNumber = Number(line) - 1;
      selection = new Range(lineNumber, Number(start), lineNumber, Number(end));
    }

    window.showTextDocument(file, {
      selection: selection,
    });
  };

  private onCustomMessage = async (message: CustomMessage) => {
    this.plugin.debug(`recieved onCustomMessage ${message.customMessage}`);
  };

  private clearOutputPath = async () => {
    const outputPath = this.getOutputPath();
    await workspace.fs.delete(outputPath, { recursive: true });
  };

  private readFilesFromTTS = async (scriptStates: IncomingJsonObject[], openFiles?: boolean) => {
    const outputPath = this.getOutputPath();
    const bundledPath = this.getBundledPath();

    this.plugin.debug(`Writing scripts to ${outputPath}`);
    this.plugin.setStatus(`Recieved ${scriptStates.length} scripts`);

    const writeScriptFiles = async (file: ObjectFile, script: ScriptFile, extension: string) => {
      const fileName = `${file.fileName}.${extension}`;
      const baseFile = await writeWorkspaceFile(outputPath, fileName, script.content);
      writeWorkspaceFile(bundledPath, fileName, script.bundled);
      if (openFiles) {
        window.showTextDocument(baseFile);
      }
    };

    scriptStates.map(toFileInfo).forEach(async (file) => {
      this.objectPaths.set(file.guid, file.fileName);
      writeScriptFiles(file, file.script, "lua");

      if (file.ui) {
        writeScriptFiles(file, file.ui, "xml");
      }
    });
  };

  private createScripts = async (files: FileInfo[], directory: Uri) => {
    const scripts = new Map<string, OutgoingJsonObject>();

    const includePathsLua = configuration.luaIncludePaths();
    const includePathXml = configuration.xmlIncludePath();
    this.plugin.debug(`Using Lua include paths ${includePathsLua}`);
    this.plugin.debug(`Using XML include path ${includePathXml}`);

    if (configuration.tstlEnalbed()) {
      this.runTstl();
    }

    let hasErrors: boolean = false;

    for (const [fileName] of files) {
      const guid = fileName.split(".")[1];
      const fileUri = directory.with({
        path: posix.join(directory.path, fileName),
      });

      if (!scripts.has(guid)) {
        scripts.set(guid, { guid, script: "" });
      }

      try {
        if (fileName.endsWith(".lua")) {
          const lua = await bundleLua(fileUri, includePathsLua);
          scripts.get(guid)!.script = lua;
        } else if (fileName.endsWith(".xml")) {
          const xml = await bundleXml(fileUri, includePathXml);
          scripts.get(guid)!.ui = xml;
        }
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

  private getBundledFileName = async (guid: string) => {
    const directory = this.getBundledPath();
    const files = await workspace.fs.readDirectory(directory);

    for (const [name] of files) {
      if (name.endsWith(`.${guid}.lua`)) {
        return Uri.joinPath(directory, name);
      }
    }

    return undefined;
  };

  private runTstl = () => {
    const path = this.getTSTLPath();
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
      getCurrentDirectory: () => this.getOutputPath().toString(),
      getCanonicalFileName: (fileName: string) => fileName,
      getNewLine: () => "\n",
    };

    const output = formatDiagnostics(result.diagnostics, host);
    if (output.length > 0) {
      this.plugin.info(output);
    }
    this.plugin.endProgress();
  };

  private getWorkspaceRoot = (): Uri => {
    if (!workspace.workspaceFolders) {
      throw new Error("No workspace selected");
    }

    return workspace.workspaceFolders[0].uri;
  };

  private getOutputPath = (): Uri => {
    const root = this.getWorkspaceRoot();
    return Uri.joinPath(root, "/.tts");
  };

  private getBundledPath = (): Uri => {
    return Uri.joinPath(this.getOutputPath(), "/bundled");
  };

  private getTSTLPath = (): string => {
    const root = this.getWorkspaceRoot();
    const path = configuration.tstlPath();
    return Uri.joinPath(root, path).fsPath;
  };
}

interface ObjectFile {
  /** The GUID of the object */
  guid: string;
  /** Base file name created for this object (without extension). */
  fileName: string;
  /** The attached Lua script */
  script: ScriptFile;
  ui?: ScriptFile;
}

interface ScriptFile {
  bundled: string;
  content: string;
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
