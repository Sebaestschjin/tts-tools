import { Command, Flags } from "@oclif/core";
import { embedSave } from "@tts-tools/savefile";
import { writeFileSync } from "fs";
import { findSaveFilePath, getTtsDirectory } from "../io";

interface Arguments {
  path: string;
}

export default class Embed extends Command {
  static description = "Embed an extracted TTS save file.";

  static flags = {
    help: Flags.help({ char: "h" }),
    output: Flags.string({
      char: "o",
      required: true,
      description: "Path and name of the save file that will be generated.",
    }),
    include: Flags.string({ char: "i", required: false, description: "Path to included Lua/XML files. " }),
  };

  static args = [{ name: "path", required: true, description: "The path to the extracted save file." }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Embed);
    const parsedArguments = args as Arguments;

    const saveFile = embedSave(parsedArguments.path, {
      includePath: flags.include ?? "",
    });

    this.log("Finished embedding save file");

    if (!flags.output.toLocaleLowerCase().endsWith(".json")) {
      flags.output += ".json";
    }

    const toPath = findSaveFilePath(getTtsDirectory(), flags.output, true) ?? flags.output;
    this.log('Writing result to file "%s"', toPath);

    writeFileSync(toPath, this.toJson(saveFile), { encoding: "utf-8" });
  }

  toJson(data: any) {
    let json = JSON.stringify(data, null, 2);
    json = json.replace(/[\u007F-\uFFFF]/g, function (chr) {
      return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
    });

    return json;
  }
}
