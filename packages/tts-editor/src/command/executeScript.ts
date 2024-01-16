import { Selection, TextDocument, window } from "vscode";
import { TTSAdapter } from "../ttsAdapter";

export default (adapter: TTSAdapter) => (arg?: string) => {
  if (arg) {
    adapter.executeCode(arg);
  } else {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    const document = editor.document;
    const text = getText(document, editor.selections);
    adapter.executeCode(text);
  }
};

const getText = (document: TextDocument, selections: readonly Selection[]) => {
  const activeSelections = selections.filter((s) => !s.isEmpty);
  if (activeSelections.length === 0) {
    return document.getText();
  }

  return activeSelections.map((s) => document.getText(s)).join("\n");
};
