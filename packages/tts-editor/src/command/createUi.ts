import { Plugin } from "../plugin";
import { TTSObjectItem } from "../view/ttsObjectTreeProvider";

export default (plugin: Plugin) => (arg: TTSObjectItem) => {
  plugin.createObjectFile(arg.object, "xml", "");
};
