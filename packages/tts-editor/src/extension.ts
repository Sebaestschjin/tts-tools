import * as vscode from "vscode";
import { TTSAdapter } from "./ttsAdapter";
import { createWorkspaceFolder } from "./io/files";

export const extensionName = "ttsEditor";

export function activate(context: vscode.ExtensionContext) {
  createWorkspaceFolder();
  const log = vscode.window.createOutputChannel("TTS Edtior");

  const adapter: TTSAdapter = new TTSAdapter(log);

  registerGetObjects(context, adapter);
  registerSaveAndPlay(context, adapter);
  registerExecuteCode(context, adapter);

  log.appendLine(`${extensionName} activated`);
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
      adapter.executeCode("print('Hello World')");
    })
  );
};

export function deactivate() {
  console.log(`${extensionName} deactivated`);
}
