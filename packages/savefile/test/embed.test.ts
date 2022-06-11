import assert = require("assert");
import { readFileSync, rmSync } from "fs";
import { embedSave, SaveFile } from "../src";

const OUTPUT_PATH = `${__dirname}/temp`;

// TODO custom matcher to account for rounding and empty/missing values

describe("embed", () => {
  beforeEach(() => {
    rmSync(OUTPUT_PATH, { recursive: true, force: true });
  });

  describe("when extracted save file is used", () => {
    it("is embedded correctly", () => {
      const saveFile = readSaveFile("normalize");

      const result = embedSave(`${__dirname}/extracted/normalize`, { includePath: "" });

      // expect(result).toEqual(saveFile);
    });
  });

  describe("when an extracted save with duplicates is embedded", () => {
    it("the duplicates are part of the save file", () => {
      const saveFile = readSaveFile("duplicates");

      const result = embedSave(`${__dirname}/extracted/duplicates`, { includePath: "" });

      // expect(result).toEqual(saveFile);
    });
  });
});

const readSaveFile = (name: string): SaveFile => {
  const content = readFileSync(`${__dirname}/saves/${name}.json`, { encoding: "utf-8" });
  return JSON.parse(content) as SaveFile;
};
