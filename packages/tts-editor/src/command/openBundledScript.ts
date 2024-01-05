import { TTSScriptItem } from "../view/ttsObjectTreeProvider";

export default (arg?: TTSScriptItem) => {
  if (arg instanceof TTSScriptItem) {
    arg.openBundledScript();
  }
};
