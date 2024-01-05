import { TTSScriptItem } from "../view/ttsObjectTreeProvider";

export default (arg: any) => {
  if (arg instanceof TTSScriptItem) {
    arg.openBundledScript();
  }
};
