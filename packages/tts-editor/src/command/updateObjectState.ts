import { window } from "vscode";

import { Plugin } from "../plugin";
import { TTSAdapter } from "../ttsAdapter";

export default (plugin: Plugin, adapter: TTSAdapter) => async () => {
  if (!window.activeTextEditor) {
    window.showErrorMessage("No active text editor while trying to update object state");
    return;
  }

  const document = window.activeTextEditor.document;
  const fileNameMatch = document.fileName.match(/\\([^\\]+)\.state\.txt$/);
  if (!fileNameMatch) {
    window.showErrorMessage("The current text editor is not an object state file");
    return;
  }

  const fileName = fileNameMatch[1];
  const object = plugin.getLoadedObjectByFileName(fileName);
  if (!object) {
    window.showErrorMessage("The object for this file is currently not loaded. Can not update it's state");
    return;
  }

  if (object.isGlobal) {
    window.showWarningMessage("Can not update state for Global");
    return;
  }

  const state = document.getText();
  const command = `local object = getObjectFromGUID("${object.guid}")
if not object or object.isDestroyed() then
  error("The object with GUID ${object.guid} doesn't exist")
end

object.script_state = [[${state}]]
object.reload()`;

  console.log(command);
  adapter.executeCode(command);
};
