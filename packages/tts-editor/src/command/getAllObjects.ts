import { Plugin } from "../plugin";
import { TTSAdapter } from "../ttsAdapter";

export default (adapter: TTSAdapter) => async () => {
  const command = `
    local guids = {}

    for _, obj in ipairs(getObjects()) do
      table.insert(guids, obj.getGUID())
    end

    return json.serialize(guids)
    `;

  const guids = JSON.parse(await adapter.executeCode(command));

  for (const guid of guids) {
    const dataCommand = `return getObjectFromGUID("${guid}").getJSON()`;
    const data = JSON.parse(await adapter.executeCode(dataCommand));
    console.log(data);
  }
};
