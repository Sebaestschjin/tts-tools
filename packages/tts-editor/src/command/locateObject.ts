import { TTSAdapter } from "../ttsAdapter";
import { TTSObjectItem } from "../view/ttsObjectTreeProvider";

export default (adapter: TTSAdapter) => async (arg: any) => {
  if (arg instanceof TTSObjectItem) {
    const command = `
local obj = getObjectFromGUID("${arg.object.guid}")
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
  }
};
