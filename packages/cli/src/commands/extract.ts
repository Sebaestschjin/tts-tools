import { Command, Flags } from "@oclif/core";
import { extractSave, SaveFile } from "@tts-tools/savefile";
import { mkdirSync, readFileSync, rmSync } from "fs";
import { findSaveFilePath, getTtsDirectory } from "../io";

interface Arguments {
  saveFile: string;
}

export default class Extract extends Command {
  static description = "Extract the TTS save file from a given path.";

  static flags = {
    help: Flags.help({ char: "h" }),
    output: Flags.string({ char: "o", required: true, description: "Output path." }),
    clean: Flags.boolean({
      char: "c",
      default: false,
      description: "If set, the output directory will be deleted before extracting.",
    }),
    normalize: Flags.boolean({
      char: "n",
      default: false,
      description:
        "If set, all floating point numbers will be rounded to the nearest 0.0001 value within the data files.",
    }),
  };

  static args = [{ name: "saveFile", required: true, description: "Path to a TTS save file." }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Extract);
    const parsedArguments = args as Arguments;

    if (flags.clean) {
      rmSync(flags.output, { recursive: true });
    }
    mkdirSync(flags.output, { recursive: true });

    if (!parsedArguments.saveFile.toLocaleLowerCase().endsWith(".json")) {
      parsedArguments.saveFile += ".json";
    }

    const saveFile = this.getSaveFile(parsedArguments.saveFile);

    extractSave(saveFile, {
      output: flags.output!,
      normalize: flags.normalize,
    });

    this.log('Finished extracting to path "%s"', flags.output);
  }

  getSaveFile(name: string): SaveFile {
    let saveFilePath = findSaveFilePath(".", name, false);
    if (!saveFilePath) {
      saveFilePath = findSaveFilePath(getTtsDirectory(), name, true);
    }

    if (!saveFilePath) {
      this.error(
        "Can not find a save file with given path.\n" +
          "Neither in the current directory, nor in any diretories for TTS saves."
      );
    }

    this.log("Found save file at %s", saveFilePath);
    return this.readSaveFile(saveFilePath);
  }

  readSaveFile(path: string): SaveFile {
    const saveFile = readFileSync(path, { encoding: "utf-8" });
    return JSON.parse(saveFile) as SaveFile;
  }
}
