#!/usr/bin/env node
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { setupCommand as setupEmbed } from "./commands/embed";
import { setupCommand as setupExtract } from "./commands/extract";
import { setupCommand as setupPackage } from "./commands/package";

const argv = yargs(hideBin(process.argv));

setupEmbed(argv);
setupExtract(argv);
setupPackage(argv);

argv.parseSync();
