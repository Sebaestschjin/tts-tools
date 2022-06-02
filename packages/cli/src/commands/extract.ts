import { Command, Flags } from "@oclif/core";
import { extractSave, SaveFile } from "@tts-tools/savefile";
import { mkdirSync, readFileSync, rmSync } from "fs";

export default class Extract extends Command {
  static description = "Extracts the TTS save file from a given path";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    output: Flags.directory({ required: true }),
    clean: Flags.boolean({ default: false }),
    normalize: Flags.boolean({ char: "n", default: false }),
  };

  static args = [{ name: "saveFile", required: true }];

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Extract);

    if (flags.clean) {
      rmSync(flags.output!, { recursive: true });
    }
    mkdirSync(flags.output!, { recursive: true });

    const saveFile = this.readSaveFile(args.saveFile);

    extractSave(saveFile, {
      output: flags.output!,
      normalize: flags.normalize,
    });
  }

  readSaveFile(path: string): SaveFile {
    const saveFile = readFileSync(path, { encoding: "utf-8" });
    return JSON.parse(saveFile) as SaveFile;
  }
}
