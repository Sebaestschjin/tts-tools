import { join, posix } from "path";
import { FileType, OutputChannel, TextEditor, Uri, ViewColumn, Webview, WebviewPanel, window, workspace } from "vscode";

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

import configuration from "./configuration";

import { bundleLua, bundleXml, unbundleLua, unbundleXml } from "./bundle";
import { openTempFile, tempFolder, writeTempFile } from "./filehandler";

export default class TTSAdapter {
  private api: ExternalEditorApi;

  private output: OutputChannel;

  private tempUri: Uri;

  /**
   * @param output Output channel where logs will be written to
   */
  public constructor(output: OutputChannel) {
    this.tempUri = Uri.file(tempFolder);
    this.output = output;

    this.api = new ExternalEditorApi();
    this.initExternalEditorApi();
  }

  /**
   * Retrieves scripts from currently open game.
   */
  public getObjects = async () => {
    this.output.appendLine("Getting objects");
    addTempDirectoryToWorkspace(this.tempUri);
    this.api.getLuaScripts();
  };

  public saveAndPlay = async () => {
    if (!hasTempDirectoryInWorkspace(this.tempUri)) {
      window.showErrorMessage(
        "The workspace does not contain the Tabletop Simulator folder.\n" +
          "Get Lua Scripts from game before trying to Save and Play.",
        { modal: true }
      );
      return;
    }

    try {
      await saveAllFiles();
      const files = await readFiles(this.tempUri);
      const scripts = await createScripts(files, this.tempUri);
      this.api.saveAndPlay(scripts);
    } catch (e) {
      console.error(e);
    }
  };

  public executeCode = async () => {
    return this.api.executeLuaCode("print('Hello World')");
  };

  private initExternalEditorApi = () => {
    this.api.on("loadingANewGame", this.onGameLoaded.bind(this));
    this.api.on("pushingNewObject", this.onObjectPushed.bind(this));
    this.api.on("objectCreated", this.onObjectCreated.bind(this));
    this.api.on("printDebugMessage", this.onPrintMessage.bind(this));
    this.api.on("errorMessage", this.onErrorMessage.bind(this));
    this.api.on("customMessage", this.onCustomMessage.bind(this));
    this.api.listen();
  };

  private onGameLoaded = async (loadMessage: LoadingANewGame) => {
    this.info("onGameLoaded");
    this.readFilesFromTTS(loadMessage.scriptStates);
  };

  private onObjectPushed = async (objectMessage: PushingNewObject) => {
    this.readFilesFromTTS(objectMessage.scriptStates);
  };

  private onObjectCreated = async (objectMessage: ObjectCreated) => {
    console.log("Created", objectMessage.guid);
  };

  private onPrintMessage = async (printMessage: PrintDebugMessage) => {
    this.output.appendLine(printMessage.message);
  };

  private onErrorMessage = async (errorMessage: ErrorMessage) => {
    this.output.appendLine(errorMessage.error);
  };

  private onCustomMessage = async (customMessage: CustomMessage) => {};

  /**
   * Sends a custom structured object.
   *
   * @param object - Table to be sent to game
   */
  public async customMessage(object: any) {
    return this.api.customMessage(object);
  }

  private readFilesFromTTS = async (scriptStates: IncomingJsonObject[]) => {
    // TODO delete old files
    // TODO auto open files
    // TODO split raw files

    scriptStates.map(toFile).forEach((file) => {
      writeTempFile(`${file.fileName}.raw.lua`, file.script.raw);
      writeTempFile(`${file.fileName}.lua`, file.script.content);

      if (file.ui) {
        writeTempFile(`${file.fileName}.raw.xml`, file.ui.raw);
        writeTempFile(`${file.fileName}.xml`, file.ui.content);
      }
    });
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
    raw: string;
    content: string;
  };
  ui?: {
    raw: string;
    content: string;
  };
}

const toFile = (object: IncomingJsonObject): ObjectFile => {
  const baseName = object.name.replace(/([":<>/\\|?*])/g, "");
  const fileName = `${baseName}.${object.guid}`;

  return {
    fileName: fileName,
    script: {
      raw: object.script,
      content: unbundleLua(object.script),
    },
  };
};

const addTempDirectoryToWorkspace = (tempDirectory: Uri) => {
  const vsFolders = workspace.workspaceFolders;
  if (!vsFolders || vsFolders.findIndex((dir) => dir.uri.fsPath === tempDirectory.fsPath) === -1) {
    workspace.updateWorkspaceFolders(vsFolders ? vsFolders.length : 0, null, {
      uri: tempDirectory,
    });
  }
};

const hasTempDirectoryInWorkspace = (tempDirectory: Uri) => {
  const vsFolders = workspace.workspaceFolders;
  if (!vsFolders || vsFolders.findIndex((dir) => dir.uri.fsPath === tempDirectory.fsPath) === -1) {
    return false;
  }
  return true;
};

const saveAllFiles = async () => {
  try {
    await workspace.saveAll(false);
  } catch (reason: any) {
    throw new Error(`Unable to save opened files.\nDetail: ${reason}`);
  }
};

type FileInfo = [string, FileType];

const readFiles = async (directory: Uri): Promise<FileInfo[]> => {
  try {
    return await workspace.fs.readDirectory(directory);
  } catch (reason: any) {
    throw new Error(`Unable to read TTS Scripts directory.\nDetails: ${reason}`);
  }
};

const createScripts = async (files: FileInfo[], directory: Uri) => {
  const scripts = new Map<string, OutgoingJsonObject>();
  const actualFiles = files.filter(([_, fileType]) => fileType !== FileType.Directory);

  for (const [fileName] of actualFiles) {
    const guid = fileName.split(".")[1];
    const fileUri = directory.with({
      path: posix.join(directory.path, fileName),
    });

    if (!scripts.has(guid)) {
      scripts.set(guid, { guid, script: "" });
    }

    try {
      if (fileName.endsWith(".lua") || fileName.endsWith(".ttslua")) {
        scripts.get(guid)!.script = await bundleLua(fileUri);
      } else if (fileName.endsWith(".xml")) {
        scripts.get(guid)!.ui = await bundleXml(fileUri);
      }
    } catch (error: any) {
      window.showErrorMessage(error.message);
      console.error(error.stack);
    }
  }

  return Array.from(scripts.values());
};
