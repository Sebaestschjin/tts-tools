import { ExtensionContext, commands, window } from "vscode";
import openScript from "./command/openScript";
import { createWorkspaceFolder } from "./io/files";
import { Plugin } from "./plugin";
import { TTSAdapter } from "./ttsAdapter";
import { TTSObjectTreeProvider } from "./view/ttsObjectTreeProvider";
import getScripts from "./command/getScripts";
import saveAndPlay from "./command/saveAndPlay";
import executeScript from "./command/executeScript";
import showOutput from "./command/showOutput";

export const extensionName = "ttsEditor";

export function activate(context: ExtensionContext) {
  createWorkspaceFolder();
  const plugin = new Plugin();
  const view = new TTSObjectTreeProvider(plugin);
  const adapter: TTSAdapter = new TTSAdapter(plugin, view);

  const registerCommand = (name: string, handler: Parameters<typeof commands.registerCommand>[1]) => {
    context.subscriptions.push(commands.registerCommand(`${extensionName}.${name}`, handler));
  };

  registerCommand("getObjects", getScripts(adapter));
  registerCommand("saveAndPlay", saveAndPlay(adapter));
  registerCommand("executeCode", executeScript(adapter));
  registerCommand("showOutput", showOutput(plugin));
  registerCommand("openBundledScript", openScript);

  window.registerTreeDataProvider("ttsObjects", view);

  console.log("tts-tools-vscode activated");
}

export function deactivate() {
  console.log(`${extensionName} deactivated`);
}
