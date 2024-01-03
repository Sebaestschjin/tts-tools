import * as vscode from "vscode";
import { TTSAdapter } from "./ttsAdapter";
import { createWorkspaceFolder } from "./io/files";
import { Plugin } from "./plugin";

export const extensionName = "ttsEditor";

export function activate(context: vscode.ExtensionContext) {
  createWorkspaceFolder();
  const plugin = new Plugin();

  const adapter: TTSAdapter = new TTSAdapter(plugin);

  registerGetObjects(context, adapter);
  registerSaveAndPlay(context, adapter);
  registerExecuteCode(context, adapter);

  console.log("tts-tools-vscode activated");
}

const registerGetObjects = (context: vscode.ExtensionContext, adapter: TTSAdapter) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${extensionName}.getObjects`, async () => {
      const chosen = await vscode.window.showInformationMessage(
        "Get Lua Scripts from game?\n\n" +
          "This will erase any changes that you have made in Visual Studio Code since the last Save & Play.",
        { modal: true },
        "Get Objects"
      );

      if (chosen === "Get Objects") {
        await adapter.getObjects();
      }
    })
  );
};

const registerSaveAndPlay = (context: vscode.ExtensionContext, adapter: TTSAdapter) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${extensionName}.saveAndPlay`, () => {
      adapter.saveAndPlay();
    })
  );
};

const registerExecuteCode = (context: vscode.ExtensionContext, adapter: TTSAdapter) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(`${extensionName}.executeCode`, () => {
      const content = vscode.window.activeTextEditor?.document.getText();
      if (content) {
        adapter.executeCode(content);
      }
    })
  );
};

export function deactivate() {
  console.log(`${extensionName} deactivated`);
}
