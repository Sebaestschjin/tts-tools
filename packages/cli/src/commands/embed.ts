import { Command, Flags } from "@oclif/core";
import { embedSave } from "@tts-tools/savefile";
import { writeFileSync } from "fs";

export default class Embed extends Command {
  static description = "describe the command here";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    output: Flags.string({ required: true }),
    include: Flags.string({ char: "i", required: true }),
  };

  static args = [{ name: "path" }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Embed);

    const saveFile = embedSave(args.path, {
      includePath: flags.include,
    });

    writeFileSync(flags.output, this.toJson(saveFile), {
      encoding: "utf-8",
    });
  }

  toJson(data: any) {
    let json = JSON.stringify(data, null, 2);
    json = json.replace(/[\u007F-\uFFFF]/g, function (chr) {
      return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
    });

    return json;
  }
}
