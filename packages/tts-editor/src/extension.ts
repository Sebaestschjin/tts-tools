import { ExtensionContext, commands, window } from "vscode";
import createUi from "./command/createUi";
import executeScript from "./command/executeScript";
import getObjectState from "./command/getObjectState";
import getRuntimeUi from "./command/getRuntimeUi";
import getScripts from "./command/getScripts";
import openBundledScript from "./command/openBundledScript";
import { saveAndPlay, saveAndPlayBundled } from "./command/saveAndPlay";
import showOutput from "./command/showOutput";
import showView from "./command/showView";
import updateObjectState from "./command/updateObjectState";
import { FileHandler } from "./io/files";
import { Plugin } from "./plugin";
import { TTSAdapter } from "./ttsAdapter";
import { TTSObjectItem, TTSObjectTreeProvider } from "./view/ttsObjectTreeProvider";

export const extensionName = "ttsEditor";

export function activate(context: ExtensionContext) {
  const fileHandler = new FileHandler(context.extension);
  const plugin = new Plugin(fileHandler);
  const viewProvider = new TTSObjectTreeProvider(plugin);
  const view = window.createTreeView("ttsEditor.objectView", {
    treeDataProvider: viewProvider,
  });
  const adapter: TTSAdapter = new TTSAdapter(plugin, viewProvider);

  const registerCommand = (name: string, handler: Parameters<typeof commands.registerCommand>[1]) => {
    context.subscriptions.push(commands.registerCommand(`${extensionName}.${name}`, handler));
  };

  registerCommand("getObjects", getScripts(adapter));
  registerCommand("saveAndPlay", saveAndPlay(adapter));
  registerCommand("saveAndPlayBundled", saveAndPlayBundled(adapter));
  registerCommand("executeCode", executeScript(adapter));
  registerCommand("showOutput", showOutput(plugin));
  registerCommand("showView", showView(view));
  registerCommand("openBundledScript", openBundledScript);
  registerCommand("createUi", createUi(plugin));
  registerCommand("getRuntimeUi", getRuntimeUi(plugin, adapter));
  registerCommand("getObjectState", getObjectState(plugin, adapter));
  registerCommand("updateObjectState", updateObjectState(plugin, adapter));
  registerCommand("locateObject", (arg?: TTSObjectItem) => adapter.executeMacro("locateObject", arg?.object));

  window.registerTreeDataProvider("ttsEditor.objectView", viewProvider);

  console.log("tts-tools-vscode activated");
}

export function deactivate() {
  console.log(`${extensionName} deactivated`);
}
