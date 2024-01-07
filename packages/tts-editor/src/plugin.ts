import { OutputChannel, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { LoadedObject } from "./model/objectData";
import { FileHandler, hasOutputFile, writeOutputFile } from "./io/files";

export class Plugin {
  public readonly fileHandler: FileHandler;
  private output: OutputChannel;
  private status: StatusBarItem;
  private loadedObjects: Map<string, LoadedObject> = new Map();

  /**
   * @param output Output channel where logs will be written to
   */
  public constructor(fileHandler: FileHandler) {
    this.fileHandler = fileHandler;
    this.output = window.createOutputChannel("TTS Edtior");
    this.status = window.createStatusBarItem("tts.status", StatusBarAlignment.Left, -1);
    this.status.command = "ttsEditor.showOutput";

    this.setBaseStatus();
  }

  resetLoadedObjects = () => {
    this.loadedObjects.clear();
    this.endProgress();
  };

  createObjectFile = async (object: LoadedObject, extension: string, content: string) => {
    const file = `${object.fileName}.${extension}`;
    if (await hasOutputFile(file)) {
      window.showWarningMessage("UI file already exists.");
    } else {
      writeOutputFile(file, content);
      this.loadedObjects.get(object.guid)!.hasUi = true;
    }
  };

  setLoadedObject = (loaded: LoadedObject) => {
    this.loadedObjects.set(loaded.guid, loaded);
  };

  getLoadedObject = (guid: string): LoadedObject | undefined => {
    return this.loadedObjects.get(guid);
  };

  getLoadedObjectByFileName = (fileName: string): LoadedObject | undefined => {
    for (const [_, object] of this.loadedObjects) {
      if (object.fileName.toLocaleLowerCase() === fileName.toLocaleLowerCase()) {
        return object;
      }
    }

    return undefined;
  };

  getLoadedObjects = (): LoadedObject[] => {
    const objects: LoadedObject[] = [];

    for (const [_, object] of this.loadedObjects) {
      objects.push(object);
    }

    return objects;
  };

  startProgress = (message: string) => {
    this.status.text = `$(loading~spin) ${message}`;
  };

  endProgress = () => {
    this.setBaseStatus();
  };

  setStatus = (result: string) => {
    this.setBaseStatus(result);
    setTimeout(() => this.setBaseStatus(), 5000);
  };

  showOutput = () => {
    this.output.show();
  };

  debug = (message: string) => {
    console.debug(message);
  };

  info = (message: string) => {
    console.log(message);
    this.output.appendLine(message);
  };

  error = (message: string) => {
    console.error(message);
    this.output.appendLine(message);
  };

  private setBaseStatus = (postfix?: string) => {
    let text = "TTS";
    if (postfix) {
      text += ` - ${postfix}`;
    }

    this.status.text = text;
    this.status.show();
  };
}
