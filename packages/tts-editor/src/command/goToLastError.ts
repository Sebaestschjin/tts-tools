import { TTSAdapter } from "../ttsAdapter";

export default (adapter: TTSAdapter) => () => {
  adapter.goToLastError();
};
