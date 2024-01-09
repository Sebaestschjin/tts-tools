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
import { TTSObject as SaveFileObject, bundleObject, unbundleObject } from "@tts-tools/savefile";
import { DiagnosticCategory, FormatDiagnosticsHost, formatDiagnostics } from "typescript";
import { Range, window, workspace } from "vscode";

import { command } from "./command";
import configuration from "./configuration";
import { selectObject } from "./interaction/selectObject";
import { bundleLua, bundleXml, runTstl, unbundleLua, unbundleXml } from "./io/bundle";
import { getOutputFileUri, getOutputPath, getTstlPath, readOutputFile, writeOutputFile } from "./io/files";
import {
  EditorMessage,
  MessageFormat,
  RequestEditorMessage,
  RequestObjectMessage,
  WriteContentMessage as WriteContentMessage,
} from "./message";
import { LoadedObject } from "./model/objectData";
import { Plugin } from "./plugin";

const defaultPolyFills = ["messageBridge", "object", "write"];

export class TTSAdapter {
  private api: ExternalEditorApi;
  private plugin: Plugin;

  public constructor(plugin: Plugin) {
    this.api = new ExternalEditorApi();
    this.plugin = plugin;

    this.initExternalEditorApi();
  }

  /**
   * Retrieves scripts from currently open game.
   */
  public getObjects = async () => {
    this.api.getLuaScripts();
  };

  /**
   * Sends the bundled scripts to TTS
   */
  public saveAndPlay = async (bundled: boolean = false) => {
    try {
      await saveAllFiles();

      const { scripts, hasErrors } = await this.plugin.progress("Bundling scripts", async () =>
        this.createScripts(bundled)
      );
      if (!hasErrors) {
        this.plugin.progress("Sending scripts to TTS", async () => this.api.saveAndPlay(scripts));
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

    return this.api.executeLuaCodeAndReturn(completeScript) as T;
  };

  public executeMacro = async (name: string, object?: LoadedObject) => {
    const command = await this.plugin.fileHandler.readExtensionFile(`macro/${name}.lua`);
    const parameters: Record<string, string> = {};

    const polyFills = ["messageBridge", "write"];
    if (!object) {
      polyFills.push("object");
    } else {
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

  public async updateObject(object: LoadedObject) {
    const readObjectFile = async (extension: string) => {
      try {
        return await this.plugin.fileHandler.readOutputFile(object, extension);
      } catch (e) {
        return undefined;
      }
    };

    const dataFile = await readObjectFile("data.json");
    if (!dataFile) {
      window.showErrorMessage(`Can not find data file for object ${object.guid}`);
      return;
    }

    const data = JSON.parse(dataFile) as SaveFileObject;
    data.LuaScript = await readObjectFile("lua");
    data.XmlUI = await readObjectFile("xml");

    const state = await readObjectFile("state.txt");
    if (state) {
      data.LuaScriptState = state;
    }

    const tstl = await this.runTstl();
    if (!tstl) {
      return;
    }

    const bundled = bundleObject(data, {
      includePath: configuration.xmlIncludePath(),
    });

    let newData = JSON.stringify(bundled);
    newData = newData.replace(/\]\]/g, ']] .. "]]" .. [[');

    const script = `
local obj = getObjectFromGUID("${object.guid}")
obj.destruct()

spawnObjectJSON({
  json = [[${newData}]]
})
`;

    await this.executeCode(script, []);

    await this.readObject(bundled.GUID);

    command.refreshView();
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
    this.plugin.progress("Reading objects", async () => this.readFilesFromTTS(message.scriptStates));
  };

  private onPushObject = async (message: PushingNewObject) => {
    this.plugin.debug(`recieved onPushObject ${message.messageID}`);
    this.readFilesFromTTS(message.scriptStates);
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
    if (!configuration.messagesEnabled()) {
      return;
    }

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
      placeholder: message.placeholder,
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

  private getObjectData = async (guid: string): Promise<SaveFileObject | undefined> => {
    const command = `
local obj = getObjectFromGUID("${guid}")
if obj and not obj.isDestroyed() then
  return obj.getJSON()
end

return nil
`;

    const data = await this.executeCode<string>(command);

    if (!data) {
      return undefined;
    }

    return JSON.parse(data) as SaveFileObject;
  };

  private readFilesFromTTS = async (incomingObjects: IncomingJsonObject[]) => {
    this.plugin.setStatus(`Recieved ${incomingObjects.length} scripts`);

    for (const object of incomingObjects) {
      if (object.guid === "-1") {
        const fileName = "Global";
        if (object.script !== undefined) {
          writeOutputFile(`${fileName}.lua`, getUnbundledLua(object.script));
          writeOutputFile(`${fileName}.lua`, object.script, true);
        }
        if (object.ui !== undefined) {
          writeOutputFile(`${fileName}.xml`, unbundleXml(object.ui));
          writeOutputFile(`${fileName}.xml`, object.ui, true);
        }

        this.plugin.setLoadedObject({
          name: "Global",
          fileName: fileName,
          isGlobal: true,
          data: {
            LuaScript: object.script, // eslint-disable-line @typescript-eslint/naming-convention
            XmlUI: object.ui, // eslint-disable-line @typescript-eslint/naming-convention
          },
        });
      } else {
        await this.readObject(object.guid);
      }
    }
  };

  private readObject = async (guid: string) => {
    const bundledData = await this.getObjectData(guid);
    if (!bundledData) {
      // The object doesn't exist anymore
      return;
    }

    const unbundledData = unbundleObject(bundledData);
    const objectName = bundledData.Nickname.length === 0 ? bundledData.Name : bundledData.Nickname;
    const baseName = objectName.replace(/([":<>/\\|?*])/g, "");
    const fileName = `${baseName}.${guid}`;

    writeOutputFile(`${fileName}.data.json`, JSON.stringify(unbundledData, null, 2));
    if (bundledData.LuaScript !== undefined) {
      writeOutputFile(`${fileName}.lua`, unbundledData.LuaScript);
      writeOutputFile(`${fileName}.lua`, bundledData.LuaScript, true);
    }
    if (bundledData.XmlUI !== undefined) {
      writeOutputFile(`${fileName}.xml`, unbundledData.XmlUI);
      writeOutputFile(`${fileName}.xml`, bundledData.XmlUI, true);
    }

    this.plugin.setLoadedObject({
      isGlobal: false,
      name: objectName,
      guid: guid,
      fileName: fileName,
      data: unbundledData,
    });
  };

  private createScripts = async (bundled: boolean) => {
    const scripts = new Map<string, OutgoingJsonObject>();

    const includePathsLua = configuration.luaIncludePaths();
    const includePathXml = configuration.xmlIncludePath();
    this.plugin.debug(`Using Lua include paths ${includePathsLua}`);
    this.plugin.debug(`Using XML include path ${includePathXml}`);

    if (!bundled) {
      const tstl = await this.runTstl();
      if (!tstl) {
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
          lua = await bundleLua(luaFile, includePathsLua);
        }
        if (xmlFile && !bundled) {
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

  private runTstl = async (): Promise<boolean> => {
    return this.plugin.progress("Running TSTL", async () => {
      if (!configuration.tstlEnalbed()) {
        return true;
      }

      let hasErrors = false;
      const path = getTstlPath();
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

      return !hasErrors;
    });
  };
}

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
