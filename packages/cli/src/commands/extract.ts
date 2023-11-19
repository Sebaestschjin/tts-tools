import { extractSave, SaveFile } from "@tts-tools/savefile";
import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { isAbsolute } from 'path';
import { Argv } from "yargs";
import { findSaveFilePath, getTtsDirectory } from "../io";

export interface Arguments {
  saveFile: string;
  output: string;
  clean: boolean;
  normalize: boolean;
}

export const setupCommand = (yargs: Argv) => {
  yargs.command("extract <saveFile>", "Extracts the given save file.", commandOptions, runCommand);
};

const commandOptions = (yargs: Argv) => {
  return yargs
    .positional("saveFile", {
      type: "string",
      demandOption: true,
      description: "Path to a TTS save file.",
    })
    .option("output", {
      alias: "o",
      type: "string",
      demandOption: true,
      description: "Output path.",
    })
    .option("clean", {
      alias: "c",
      type: "boolean",
      default: false,
      description: "If set, the output directory will be deleted before extracting.",
    })
    .option("normalize", {
      alias: "n",
      type: "boolean",
      default: false,
      description:
        "If set, all floating point numbers will be rounded to the nearest 0.0001 value within the data files.",
    });
};

const runCommand = (args: Arguments) => {
  if (args.clean && existsSync(args.output)) {
    rmSync(args.output, { recursive: true });
  }
  mkdirSync(args.output, { recursive: true });

  if (!args.saveFile.toLocaleLowerCase().endsWith(".json")) {
    args.saveFile += ".json";
  }

  const saveFile = getSaveFile(args.saveFile);

  extractSave(saveFile, {
    output: args.output,
    normalize: args.normalize,
  });

  console.log('Finished extracting to path "%s"', args.output);
};

const getSaveFile = (name: string): SaveFile => {
  let saveFilePath;
  if (isAbsolute(name)) {
    saveFilePath = name  
  }
  if (!saveFilePath) {
    saveFilePath = findSaveFilePath(".", name, false);
  }
  if (!saveFilePath) {
    saveFilePath = findSaveFilePath(getTtsDirectory(), name, true);
  }
  if (!saveFilePath) {
    throw new Error(
      "Can not find a save file with given path.\n" +
        "Neither in the current directory, nor in any diretories for TTS saves."
    );
  }

  console.log("Found save file at %s", saveFilePath);
  return readSaveFile(saveFilePath);
};

const readSaveFile = (path: string): SaveFile => {
  const saveFile = readFileSync(path, { encoding: "utf-8" });
  return JSON.parse(saveFile) as SaveFile;
};
