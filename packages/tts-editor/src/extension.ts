import { ExtensionContext, commands, window } from "vscode";

import createUi from "./command/createUi";
import executeScript from "./command/executeScript";
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
import updateObject from "./command/updateObject";

export const extensionName = "ttsEditor";

export function activate(context: ExtensionContext) {
  const fileHandler = new FileHandler(context.extension);
  const plugin = new Plugin(fileHandler);
  const viewProvider = new TTSObjectTreeProvider(plugin);
  const view = window.createTreeView("ttsEditor.objectView", {
    treeDataProvider: viewProvider,
  });
  const adapter: TTSAdapter = new TTSAdapter(plugin);

  const registerCommand = (name: string, handler: Parameters<typeof commands.registerCommand>[1]) => {
    context.subscriptions.push(commands.registerCommand(`${extensionName}.${name}`, handler));
  };

  const registerMacro = (name: string) => {
    registerCommand(name, (arg?: TTSObjectItem) => adapter.executeMacro(name, arg?.object));
  };

  registerCommand("getObjects", getScripts(adapter));
  registerCommand("saveAndPlay", saveAndPlay(adapter));
  registerCommand("saveAndPlayBundled", saveAndPlayBundled(adapter));
  registerCommand("executeCode", executeScript(adapter));
  registerCommand("showOutput", showOutput(plugin));
  registerCommand("showView", showView(view));
  registerCommand("updateView", () => viewProvider.refresh());
  registerCommand("openBundledScript", openBundledScript);
  registerCommand("createUi", createUi(plugin));
  registerCommand("updateObject", updateObject(plugin, adapter));
  registerCommand("updateObjectState", updateObjectState(plugin, adapter));

  registerMacro("getObjectState");
  registerMacro("getRuntimeUi");
  registerMacro("locateObject");

  window.registerTreeDataProvider("ttsEditor.objectView", viewProvider);

  console.log("tts-tools-vscode activated");
}

export function deactivate() {
  console.log(`${extensionName} deactivated`);
}
