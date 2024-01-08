import { selectObject } from "../interaction/selectObject";
import { Plugin } from "../plugin";
import { TTSAdapter } from "../ttsAdapter";
import { TTSObjectItem } from "../view/ttsObjectTreeProvider";

export default (plugin: Plugin, adapter: TTSAdapter) => async (arg?: TTSObjectItem) => {
  if (arg) {
    adapter.updateObject(arg.object);
  } else {
    const selection = await selectObject(plugin);
    if (!selection) {
      return;
    }
    adapter.updateObject(selection);
  }
};
