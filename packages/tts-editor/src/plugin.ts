import { OutputChannel, ProgressLocation, StatusBarAlignment, StatusBarItem, window } from "vscode";

import { LoadedObject, SetLoadedObject } from "./model/objectData";
import { FileHandler, hasOutputFile, writeOutputFile } from "./io/files";
import { command } from "./command";

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

    command.refreshView();
  };

  createObjectFile = async (object: LoadedObject, extension: string, content: string) => {
    const file = `${object.fileName}.${extension}`;
    if (await hasOutputFile(file)) {
      window.showWarningMessage("UI file already exists.");
    } else {
      writeOutputFile(file, content);
    }

    command.refreshView();
  };

  setLoadedObject = (loaded: SetLoadedObject) => {
    const guid = loaded.isGlobal ? "-1" : loaded.guid;
    const loadedObject: LoadedObject = loaded.isGlobal
      ? {
          isGlobal: true,
          name: "Global",
          guid: "-1",
          fileName: loaded.fileName,
          data: loaded.data,
          hasUi: !!loaded.data.XmlUI,
        }
      : {
          isGlobal: false,
          name: loaded.name,
          guid: loaded.guid,
          fileName: loaded.fileName,
          data: loaded.data,
          hasUi: !!loaded.data.XmlUI,
        };

    this.loadedObjects.set(guid, loadedObject);

    command.refreshView();
  };

  removeLoadedObject = (guid: string) => {
    this.loadedObjects.delete(guid);

    command.refreshView();
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

  progress = <T>(title: string, handler: () => Promise<T>): Thenable<T> => {
    return window.withProgress(
      {
        location: ProgressLocation.Window,
        title: title,
      },
      handler
    );
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
