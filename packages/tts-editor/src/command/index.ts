import { commands } from "vscode";

export const command = {
  refreshView: () => commands.executeCommand("ttsEditor.updateView"),
};
