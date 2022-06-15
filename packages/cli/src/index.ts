import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { setupCommand as setupEmbed } from "./commands/embed";
import { setupCommand as setupExtract } from "./commands/extract";

const argv = yargs(hideBin(process.argv));

setupEmbed(argv);
setupExtract(argv);

argv.parseSync();
