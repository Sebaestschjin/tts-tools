import { commands, ExtensionContext, window } from "vscode";
import { createWorkspaceFolder } from "./filehandler";
import TTSAdapter from "./TTSAdapter";

export function activate(context: ExtensionContext) {
  createWorkspaceFolder();

  const log = window.createOutputChannel("TTS Edtior");

  const adapter = new TTSAdapter(context.extensionPath, log);
  console.debug("[TTSLua] Tabletop Simulator Extension Loaded");

  registerGetObjects(context, adapter);
  registerSaveAndPlay(context, adapter);
  registerExecuteCode(context, adapter);
}

const registerGetObjects = (context: ExtensionContext, adapter: TTSAdapter) => {
  context.subscriptions.push(
    commands.registerCommand("ttseditor.getObjects", async () => {
      const chosen = await window.showInformationMessage(
        "Get Lua Scripts from game?\n\n" +
          "This will erase any changes that you have made in Visual Studio Code since the last Save & Play.",
        { modal: true },
        "Get Objects"
      );

      if (chosen === "Get Objects") {
        adapter.getObjects();
      }
    })
  );
};

const registerSaveAndPlay = (context: ExtensionContext, adapter: TTSAdapter) => {
  context.subscriptions.push(
    commands.registerCommand("ttseditor.saveAndPlay", () => {
      adapter.saveAndPlay();
    })
  );
};

const registerExecuteCode = (context: ExtensionContext, adapter: TTSAdapter) => {
  context.subscriptions.push(
    commands.registerCommand("ttseditor.executeCode", () => {
      adapter.executeCode();
    })
  );
};

export function deactivate() {
  console.debug("Tabletop Simulator Extension Unloaded");
}
