import { window } from "vscode";

import { performForSelectedObject } from "../interaction/selectObject";
import { writeOutputFile } from "../io/files";
import { LoadedObject } from "../model/objectData";
import { Plugin } from "../plugin";
import { TTSAdapter } from "../ttsAdapter";
import { TTSObjectItem } from "../view/ttsObjectTreeProvider";

export default (plugin: Plugin, adapter: TTSAdapter) => async (arg?: TTSObjectItem) => {
  const perform = async (object: LoadedObject) => {
    const objectReference = object.isGlobal ? `Global` : `getObjectFromGUID("${object.guid}")`;

    const command = `return ${objectReference}.UI.getXml()`;

    const res = (await adapter.executeCode(command)) as string;
    const ui = await writeOutputFile(`${object.fileName}.runtime.xml`, res);
    window.showTextDocument(ui);
  };

  if (!arg) {
    performForSelectedObject(plugin, perform, {
      includeGlobal: true,
    });
  } else {
    perform(arg.object);
  }
};
