import { TTSAdapter } from "../ttsAdapter";

export const saveAndPlay = (adapter: TTSAdapter) => () => {
  adapter.saveAndPlay();
};

export const saveAndPlayBundled = (adapter: TTSAdapter) => () => {
  adapter.saveAndPlay("bundle");
};
