import { performForSelectedObject } from "../interaction/selectObject";
import { LoadedObject } from "../model/objectData";
import { Plugin } from "../plugin";
import { TTSAdapter } from "../ttsAdapter";
import { TTSObjectItem } from "../view/ttsObjectTreeProvider";

export default (plugin: Plugin, adapter: TTSAdapter) => async (arg: any) => {
  const perform = (object: LoadedObject) => {
    const command = `
    local obj = getObjectFromGUID("${object.guid}")
    local interval = 0.1
    local totalTime = 5
    local repeats = (1 / interval) * totalTime

    Wait.time(function()
      obj.highlightOn({
        r = math.random(),
        g = math.random(),
        b = math.random(),
      })
    end, interval, repeats)

    Wait.time(function()
      obj.highlightOff()
    end, totalTime)

    for _, player in ipairs(Player.getPlayers()) do
        player.pingTable(obj.getPosition())
    end
    `;
    adapter.executeCode(command);
  };

  if (!arg) {
    performForSelectedObject(plugin, perform);
  } else if (arg instanceof TTSObjectItem) {
    perform(arg.object);
  }
};
