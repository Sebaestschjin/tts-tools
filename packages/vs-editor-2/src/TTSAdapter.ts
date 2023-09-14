/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-param-reassign */
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

  private log: OutputChannel;

  private tempUri: Uri;

  private disposables: any = [];

  private extensionPath: string;

  private executeWhenDone = () => {};

  private webviewPanel: WebviewPanel | null = null;

  private commandMode: boolean = false;

  /**
   * Builds new TTSAdapter instance.
   *
   * @param extensionPath - Path where the extension is running, should be passed down from context.
   */
  public constructor(extensionPath: string, log: OutputChannel) {
    this.tempUri = Uri.file(tempFolder);
    this.extensionPath = extensionPath;
    this.log = log;

    this.api = new ExternalEditorApi();
    this.initExternalEditorApi();
  }

  private initExternalEditorApi() {
    this.api.on("loadingANewGame", this.onGameLoaded.bind(this));
    this.api.on("pushingNewObject", this.onObjectPushed.bind(this));
    this.api.on("objectCreated", this.onObjectCreated.bind(this));
    this.api.on("printDebugMessage", this.onPrintMessage.bind(this));
    this.api.on("errorMessage", this.onErrorMessage.bind(this));
    this.api.on("customMessage", this.onCustomMessage.bind(this));
  }

  private async onGameLoaded(loadMessage: LoadingANewGame) {
    this.readFilesFromTTS(loadMessage.scriptStates);
  }

  private async onObjectPushed(objectMessage: PushingNewObject) {
    this.readFilesFromTTS(objectMessage.scriptStates, true);
  }

  private async onObjectCreated(objectMessage: ObjectCreated) {
    console.log("Created", objectMessage.guid);
  }

  private async onPrintMessage(printMessage: PrintDebugMessage) {
    this.log.appendLine(printMessage.message);
    // this.appendToPanel();
  }

  private async onErrorMessage(errorMessage: ErrorMessage) {
    this.appendToPanel(errorMessage.errorMessagePrefix, { class: "error" });
    this.goToTTSError(errorMessage).catch((err) => window.showErrorMessage(err.message));
  }

  private async onCustomMessage(customMessage: CustomMessage) {
    console.log(customMessage.customMessage);
  }

  /**
   * Retrieves scripts from currently open savegame.
   */
  public async getObjects() {
    addTempDirectoryToWorkspace(this.tempUri);
    this.api.getLuaScripts();
  }

  /**
   * Sends all Scripts to the game.
   */
  public async saveAndPlay() {
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
  }

  public async executeCode() {
    return this.api.executeLuaCode("print('Hello World')");
  }

  /**
   * Sends a custom structured object.
   *
   * @param object - Table to be sent to game
   */
  public async customMessage(object: any) {
    return this.api.customMessage(object);
  }

  /**
   * Creates files into workspace from received scriptStates.
   *
   * @param scriptStates - State of all received scripts
   * @param previewFlag - If true, will open files in editor
   */
  private async readFilesFromTTS(scriptStates: IncomingJsonObject[], previewFlag: boolean = false) {
    const toOpen: string[] = [];
    const filesRecieved = new Set<string>();
    const autoOpen = configuration.autoOpen();
    const createXml = configuration.createXml();

    if (autoOpen === "All") {
      previewFlag = true;
    }

    scriptStates.forEach((scriptState) => {
      scriptState.name = scriptState.name.replace(/([":<>/\\|?*])/g, "");

      const baseName = `${scriptState.name}.${scriptState.guid}`;

      if (scriptState.ui || createXml) {
        const fileName = `${baseName}.xml`;
        writeTempFile(fileName, scriptState.ui ? unbundleXml(scriptState.ui) : "");
        if (previewFlag) {
          toOpen.push(fileName);
        }
        filesRecieved.add(fileName);
      }

      const fileName = `${baseName}.ttslua`;
      let fileContent = scriptState.script;
      try {
        const content = unbundleLua(fileContent);
        if (content !== "") {
          fileContent = content;
        }
      } catch (reason: any) {
        console.error(`Problem unbundling script: ${reason}`);
      }
      writeTempFile(fileName, fileContent);

      if (autoOpen === scriptState.name || previewFlag) {
        toOpen.push(fileName);
      }

      filesRecieved.add(fileName);
    });

    if (!previewFlag) {
      const files = await workspace.fs.readDirectory(this.tempUri);
      await Promise.all(
        files
          .filter(([file]) => !(file in filesRecieved))
          .map(([file]) => {
            const fileUri = this.tempUri.with({
              path: posix.join(this.tempUri.path, file),
            });
            return workspace.fs.delete(fileUri);
          })
      );
    }

    Promise.all(toOpen.map((file) => openTempFile(file))).then(
      () => {},
      (err: Error) => {
        console.error(`Unable to open files: ${err.message}`);
      }
    );
    const statusBar = window.setStatusBarMessage(
      `$(cloud-download) Received ${Object.keys(filesRecieved).length} files`
    );
    setTimeout(() => {
      statusBar.dispose();
    }, 1500);
  }

  /**
   * Shows an error from TTS and a button to jump to the line it came from.
   *
   * @param message - Error Message received from TTS
   */
  private async goToTTSError(message: ErrorMessage): Promise<TextEditor | undefined> {
    const text = message.errorMessagePrefix!;
    const re = /.*:\((?<line>\d*),(?<startChar>\d*)-(?<endChar>\d*)\):/;
    const m = re.exec(message.error!);
    if (!m) {
      window.showErrorMessage(text);
      return undefined;
    }
    // const line = parseInt(m.groups!.line, 10);
    // const startChar = parseInt(m.groups!.startChar, 10);
    // const endChar = parseInt(m.groups!.endChar, 10);
    // const errorRange = new Range(line - 1, startChar, line - 1, endChar);
    const option = await window.showErrorMessage(text, "Go to Error");
    if (!option) {
      return undefined;
    }

    return undefined;
    // if (!this.lastSentScripts) {
    //   throw Error("No saved scripts found.");
    // }
    // const script = this.lastSentScripts[message.guid!];
    // if (!script) {
    //   throw Error("No such script loaded.");
    // }
    // try {
    //   const unbundled = unbundleLua(script.script);
    //   const modules = Object.values(unbundled.modules);
    //   for (let i = 0; i < modules.length; i += 1) {
    //     const module = modules[i];
    //     const moduleRange = new Range(module.start.line, module.start.column, module.end.line, module.end.column);
    //     if (moduleRange.contains(errorRange)) {
    //       let uri: Uri;
    //       if (module.name === unbundled.metadata.rootModuleName) {
    //         const basename = `${script.name}.${script.guid}.lua`;
    //         uri = this.tempUri.with({
    //           path: posix.join(this.tempUri.path, basename),
    //         });
    //       } else {
    //         // find the file the same way we did when we bundled it
    //         const config = workspace.getConfiguration("TTSLua");
    //         const path = resolveModule(module.name, getSearchPaths(config.get("bundleSearchPattern") ?? []));
    //         if (!path) throw Error("Module containing error not found in search paths.");
    //         uri = Uri.file(path);
    //       }
    //       return window.showTextDocument(uri, {
    //         selection: new Range(
    //           errorRange.start.line - moduleRange.start.line + 1,
    //           errorRange.start.character,
    //           errorRange.end.line - moduleRange.start.line + 1,
    //           errorRange.end.character
    //         ),
    //       });
    //     }
    //   }
    // } catch (err: unknown) {
    //   if (!(err instanceof NoBundleMetadataError)) throw err;
    //   // file wasnt bundled, no complexity needed
    //   const basename = `${script.name}.${script.guid}.lua`;
    //   const uri = this.tempUri.with({
    //     path: posix.join(this.tempUri.path, basename),
    //   });
    //   return window.showTextDocument(uri, {
    //     selection: errorRange,
    //   });
    // }
    // throw Error("Encountered problem finding error line.");
  }

  /**
   * Create and show a webview panel, if it already exists just show it
   */
  public createOrShowPanel() {
    const column = window.activeTextEditor ? ViewColumn.Beside : undefined;
    if (this.webviewPanel) {
      this.webviewPanel.reveal(column);
      return;
    }

    const panel = window.createWebviewPanel("TTSConsole", "Tabletop Simulator Console++", column || ViewColumn.One, {
      enableScripts: true,
      localResourceRoots: [Uri.file(join(this.extensionPath, "assets", "webView"))],
      retainContextWhenHidden: true,
    });
    this.webviewPanel = this.webviewPanelInit(panel);
  }

  /**
   * Sets the content for a webview panel
   * @param wp - Panel to be initialized
   */
  private webviewPanelInit(wp: WebviewPanel) {
    wp.webview.html = this.getHtmlForWebview(wp.webview); // Set webview content
    wp.onDidDispose(() => this.disposePanel(), null, this.disposables);
    wp.onDidChangeViewState(
      () => {
        if (wp.visible) wp.webview.html = this.getHtmlForWebview(wp.webview);
      },
      null,
      this.disposables
    );
    // Handle messages from the webview
    wp.webview.onDidReceiveMessage(
      (message: { type: string; text: string }) => {
        switch (message.type) {
          case "command":
            this.customMessage({ command: message.text });
            break;
          case "input":
            this.customMessage(this.commandMode ? { command: message.text } : { input: message.text });
            break;
          case "done": {
            this.executeWhenDone();
            break;
          }
          default:
            break;
        }
        if (this.commandMode) {
          if ([">", "exit"].includes(message.text)) this.commandMode = false;
        } else if ([">", ">>", ">cmd"].includes(message.text)) this.commandMode = true;
      },
      null,
      this.disposables
    );
    return wp;
  }

  /**
   * Sets a new webviewpanel as current
   * @param webviewPanel - Panel to be reinitialized
   */
  public revivePanel(webviewPanel: WebviewPanel) {
    this.webviewPanel = this.webviewPanelInit(webviewPanel);
  }

  /**
   * Disposes of created panel
   */
  public disposePanel() {
    if (this.webviewPanel) {
      this.webviewPanel.dispose();
      this.webviewPanel = null;
    }

    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * Send a message to the webviewpanel
   * @param htmlString - String to send to panel
   * @param optional - Object for extra data
   * @remarks
   * Assumes panel is initialized
   */
  public appendToPanel(htmlString: string | undefined, optional?: object) {
    if (this.webviewPanel) {
      let msg = { command: "append", htmlString };
      if (optional) msg = { ...msg, ...optional };
      this.webviewPanel.webview.postMessage(msg);
    }
  }

  /**
   * Clears panel of all messages
   */
  public clearPanel() {
    if (this.webviewPanel) {
      this.webviewPanel.webview.postMessage({ command: "clear" });
    }
  }

  /**
   * Returns html string containing structure needed for Console++
   * @param webview - Webview to render to
   */
  private getHtmlForWebview(webview: Webview) {
    const config = workspace.getConfiguration("TTSLua");
    const assetPath = join(this.extensionPath, "assets", "webView");
    const scriptFileUri = Uri.file(join(assetPath, "js", "console.js"));
    const styleFileUri = Uri.file(join(assetPath, "css", "console.css"));
    const scriptUri = scriptFileUri.with({ scheme: "vscode-resource" });
    const styleUri = styleFileUri.with({ scheme: "vscode-resource" });
    const { cspSource } = webview;
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <style>
            :root {
              --ttslua-console-font-family: ${config.get("consoleFontFamily")};
              --ttslua-console-font-size: ${config.get("consoleFontSize")};
              --ttslua-console-input-height: ${config.get("consoleInputHeight")};
            }
            </style>
            <link rel="stylesheet" type="text/css" href="${styleUri}">
            <meta
              http-equiv="Content-Security-Policy"
              content="
                default-src 'none';
                img-src ${cspSource} https:;
                script-src ${cspSource} https:;
                style-src ${cspSource} 'unsafe-inline';
                font-src https:;
              "
            />
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
            <title>Tabletop Simulator Console++</title>
        </head>
        <body>
            <div id="commandInput">
              <input type="textbox" placeholder=">command"/>
            </div>
            <div id="data"></div>
            <script
              id="mainScript"
              type="module"
              src="${scriptUri}"
              clearOnFocus="${workspace.getConfiguration("TTSLua").get("clearOnFocus")}">
            />
        </body>
        </html>`;
  }
}

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
