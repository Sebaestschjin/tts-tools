import { embedSave } from "@tts-tools/savefile";
import { writeFileSync } from "fs";
import { findSaveFilePath, getTtsDirectory } from "../io";

import { Argv } from "yargs";

export interface Arguments {
  path: string;
  output: string;
  include?: string;
}

export const setupCommand = (yargs: Argv) => {
  yargs.command("embed <path>", "Embeds the given directory into a new save file.", commandOptions, runCommand);
};

const commandOptions = (yargs: Argv) => {
  return yargs
    .positional("path", {
      type: "string",
      demandOption: true,
      description: "The path to the extracted save file.",
    })
    .option("output", {
      alias: "o",
      type: "string",
      demandOption: true,
      description: "Path and name of the save file that will be generated.",
    })
    .option("include", {
      alias: "i",
      type: "string",
      description: "Path to included Lua/XML files.",
    });
};

const runCommand = (args: Arguments) => {
  const saveFile = embedSave(args.path, {
    includePath: args.include ?? "",
  });

  console.log("Finished embedding save file");

  if (!args.output.toLocaleLowerCase().endsWith(".json")) {
    args.output += ".json";
  }

  const toPath = findSaveFilePath(getTtsDirectory(), args.output, true) ?? args.output;
  console.log('Writing result to file "%s"', toPath);

  writeFileSync(toPath, toJson(saveFile), { encoding: "utf-8" });
};

const toJson = (data: any) => {
  let json = JSON.stringify(data, null, 2);
  json = json.replace(/[\u007F-\uFFFF]/g, function (chr) {
    return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
  });

  return json;
};
