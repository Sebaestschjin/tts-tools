import { window } from "vscode";
import { TTSAdapter } from "../ttsAdapter";

export default (adapter: TTSAdapter) => () => {
  const content = window.activeTextEditor?.document.getText();
  if (content) {
    adapter.executeCode(content);
  }
};
