import { ExtensionContext, commands, window } from "vscode";
import executeScript from "./command/executeScript";
import getRuntimeUi from "./command/getRuntimeUi";
import getScripts from "./command/getScripts";
import locateObject from "./command/locateObject";
import openBundledScript from "./command/openBundledScript";
import { saveAndPlay, saveAndPlayBundled } from "./command/saveAndPlay";
import showOutput from "./command/showOutput";
import { createWorkspaceFolder } from "./io/files";
import { Plugin } from "./plugin";
import { TTSAdapter } from "./ttsAdapter";
import { TTSObjectTreeProvider } from "./view/ttsObjectTreeProvider";
import showView from "./command/showView";

export const extensionName = "ttsEditor";

export function activate(context: ExtensionContext) {
  createWorkspaceFolder();
  const plugin = new Plugin();
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
  registerCommand("getRuntimeUi", getRuntimeUi(plugin, adapter));
  registerCommand("locateObject", locateObject(plugin, adapter));

  // wip
  // registerCommand("getAllObjects", getAllObjects(adapter));

  window.registerTreeDataProvider("ttsEditor.objectView", viewProvider);

  console.log("tts-tools-vscode activated");
}

export function deactivate() {
  console.log(`${extensionName} deactivated`);
}
