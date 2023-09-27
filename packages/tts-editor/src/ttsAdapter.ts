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
import { OutputChannel, Range, Uri, window, workspace } from "vscode";

import { DiagnosticCategory, FormatDiagnosticsHost, formatDiagnostics } from "typescript";
import configuration from "./configuration";
import { bundleLua, bundleXml, runTstl, unbundleLua, unbundleXml } from "./io/bundle";
import { FileInfo, readFile, readWorkspaceFiles, writeWorkspaceFile } from "./io/files";

export class TTSAdapter {
  private api: ExternalEditorApi;
  private output: OutputChannel;

  /**
   * @param output Output channel where logs will be written to
   */
  public constructor(output: OutputChannel) {
    this.output = output;

    this.api = new ExternalEditorApi();
    this.initExternalEditorApi();
  }

  /**
   * Retrieves scripts from currently open game.
   */
  public getObjects = async () => {
    this.output.appendLine("Getting objects");
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
      const scripts = await this.createScripts(files, outputPath);
      this.api.saveAndPlay(scripts);
    } catch (e: any) {
      this.error(`${e}`);
    }
  };

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
    this.info("recieved onLoadGame");
    await this.clearOutputPath();
    this.readFilesFromTTS(message.scriptStates);
  };

  private onPushObject = async (message: PushingNewObject) => {
    this.info(`recieved onPushObject ${message.messageID}`);
    this.readFilesFromTTS(message.scriptStates);
  };

  private onObjectCreated = async (message: ObjectCreated) => {
    this.info(`recieved onObjectCreated ${message.guid}`);
  };

  private onPrintDebugMessage = async (message: PrintDebugMessage) => {
    this.info(message.message);
  };

  private onErrorMessage = async (message: ErrorMessage) => {
    this.info(`${message.guid} ${message.errorMessagePrefix}`);

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
    this.info(`recieved onCustomMessage ${message.customMessage}`);
  };

  private clearOutputPath = async () => {
    const outputPath = this.getOutputPath();
    await workspace.fs.delete(outputPath, { recursive: true });
  };

  private readFilesFromTTS = async (scriptStates: IncomingJsonObject[]) => {
    // TODO auto open files

    const outputPath = this.getOutputPath();
    const bundledPath = this.getBundledPath();
    this.info(`Recieved ${scriptStates.length} scripts`);
    this.info(`Writing scripts to ${outputPath}`);

    scriptStates.map(toFileInfo).forEach((file) => {
      writeWorkspaceFile(outputPath, `${file.fileName}.lua`, file.script.content);
      writeWorkspaceFile(bundledPath, `${file.fileName}.lua`, file.script.bundled);

      if (file.ui) {
        writeWorkspaceFile(bundledPath, `${file.fileName}.xml`, file.ui.bundled);
        writeWorkspaceFile(outputPath, `${file.fileName}.xml`, file.ui.content);
      }
    });
  };

  private createScripts = async (files: FileInfo[], directory: Uri) => {
    const scripts = new Map<string, OutgoingJsonObject>();
    const includePaths = configuration.includePaths();

    this.info(`Using include paths ${includePaths}`);

    if (configuration.useTSTL()) {
      this.runTstl();
    }

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
          scripts.get(guid)!.script = await bundleLua(fileUri, includePaths);
        } else if (fileName.endsWith(".xml")) {
          scripts.get(guid)!.ui = await bundleXml(fileUri, includePaths[0]);
        }
      } catch (error: any) {
        window.showErrorMessage(error.message);
        console.error(error.stack);
      }
    }

    return Array.from(scripts.values());
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
    this.info(`Running Typescript to Lua on ${path}`);
    const result = runTstl(path);

    const errors = result.diagnostics.filter((d) => d.category === DiagnosticCategory.Error);
    const warnings = result.diagnostics.filter((d) => d.category === DiagnosticCategory.Warning);

    const showLog = (option?: string) => {
      if (option) {
        this.output.show();
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
    this.info(output);
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

  private info = (message: string) => {
    console.log(message);
    this.output.appendLine(message);
  };

  private error = (message: string) => {
    console.error(message);
    this.output.appendLine(message);
  };
}

interface ObjectFile {
  fileName: string;
  script: {
    bundled: string;
    content: string;
  };
  ui?: {
    bundled: string;
    content: string;
  };
}

const toFileInfo = (object: IncomingJsonObject): ObjectFile => {
  const baseName = object.name.replace(/([":<>/\\|?*])/g, "");
  const fileName = `${baseName}.${object.guid}`;

  const ui = object.ui
    ? {
        bundled: object.script,
        content: unbundleXml(object.script),
      }
    : undefined;

  return {
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
