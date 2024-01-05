import { window } from "vscode";

import { performForSelectedObject } from "../interaction/selectObject";
import { writeOutputFile } from "../io/files";
import { LoadedObject } from "../model/objectData";
import { Plugin } from "../plugin";
import { TTSAdapter } from "../ttsAdapter";
import { TTSObjectItem } from "../view/ttsObjectTreeProvider";

export default (plugin: Plugin, adapter: TTSAdapter) => async (arg?: TTSObjectItem) => {
  const perform = async (object: LoadedObject) => {
    let command: string;
    if (object.isGlobal) {
      command = 'return Global.call("onSave")';
    } else {
      command = `return getObjectFromGUID("${object.guid}").script_state`;
    }
    let state = await adapter.executeCode<string>(command);
    state = beautify(state);

    const stateFile = await writeOutputFile(`${object.fileName}.state.txt`, state);
    window.showTextDocument(stateFile);
  };

  if (!arg) {
    performForSelectedObject(plugin, perform, {
      includeGlobal: true,
    });
  } else {
    perform(arg.object);
  }
};

const beautify = (state: string) => {
  try {
    const parsed = JSON.parse(state);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return state;
  }
};
