import { TTSAdapter } from "../ttsAdapter";

export default (adapter: TTSAdapter) => async () => {
  adapter.getObjects();
};
