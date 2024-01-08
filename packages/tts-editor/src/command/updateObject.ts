import { TTSObject, bundleObject } from "@tts-tools/savefile";

import { selectObject } from "../interaction/selectObject";
import { LoadedObject } from "../model/objectData";
import { Plugin } from "../plugin";
import { TTSAdapter } from "../ttsAdapter";
import { TTSObjectItem } from "../view/ttsObjectTreeProvider";
import configuration from "../configuration";
import { window } from "vscode";
import { command } from ".";

export default (plugin: Plugin, adapter: TTSAdapter) => async (arg?: TTSObjectItem) => {
  let object: LoadedObject;
  if (arg) {
    object = arg.object;
  } else {
    const selection = await selectObject(plugin);
    if (!selection) {
      return;
    }
    object = selection;
  }

  const readObjectFile = async (extension: string) => {
    try {
      return await plugin.fileHandler.readOutputFile(object, extension);
    } catch (e) {
      return undefined;
    }
  };

  const dataFile = await readObjectFile("data.json");
  if (!dataFile) {
    window.showErrorMessage(`Can not find data file for object ${object.guid}`);
    return;
  }

  const data = JSON.parse(dataFile) as TTSObject;
  data.LuaScript = await readObjectFile("lua");
  data.XmlUI = await readObjectFile("xml");

  const state = await readObjectFile("state.txt");
  if (state) {
    data.LuaScriptState = state;
  }

  const bundled = bundleObject(data, {
    includePath: configuration.xmlIncludePath(),
  });

  let newData = JSON.stringify(bundled);
  newData = newData.replace(/\]\]/g, ']] .. "]]" .. [[');

  const script = `
local obj = getObjectFromGUID("${object.guid}")
obj.destruct()

spawnObjectJSON({
  json = [[${newData}]]
})
`;

  adapter.executeCode(script);

  command.refreshView();
};
