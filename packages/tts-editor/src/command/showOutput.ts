import { Plugin } from "../plugin";

export default (plugin: Plugin) => () => {
  plugin.showOutput();
};
