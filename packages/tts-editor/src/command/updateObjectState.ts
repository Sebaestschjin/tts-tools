import { window } from "vscode";

import { performForSelectedObject } from "../interaction/selectObject";
import { writeOutputFile } from "../io/files";
import { LoadedObject } from "../model/objectData";
import { Plugin } from "../plugin";
import { TTSAdapter } from "../ttsAdapter";
import { TTSObjectItem } from "../view/ttsObjectTreeProvider";

export default (plugin: Plugin, adapter: TTSAdapter) => async (arg?: TTSObjectItem) => {
  console.log("TODO");

  // perform(arg.object);
};
