import { window } from "vscode";
import { TTSAdapter } from "../ttsAdapter";

export default (adapter: TTSAdapter) => async () => {
  const chosen = await window.showInformationMessage(
    "Get Lua Scripts from game?\n\n" +
      "This will erase any changes that you have made in Visual Studio Code since the last Save & Play.",
    { modal: true },
    "Get Objects"
  );

  if (chosen === "Get Objects") {
    await adapter.getObjects();
  }
};
