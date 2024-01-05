import { window } from "vscode";
import { writeOutputFile } from "../io/files";
import { TTSAdapter } from "../ttsAdapter";
import { TTSObjectItem } from "../view/ttsObjectTreeProvider";

export default (adapter: TTSAdapter) => async (arg: any) => {
  if (arg instanceof TTSObjectItem) {
    const objectReference = arg.isGlobal() ? `Global` : `getObjectFromGUID("${arg.object.guid}")`;

    const command = `return ${objectReference}.UI.getXml()`;

    const res = (await adapter.executeCode(command)) as string;
    const ui = await writeOutputFile(`${arg.object.fileName}.runtime.xml`, res);
    window.showTextDocument(ui);
  }
};
