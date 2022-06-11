import assert = require("assert");
import { readdirSync, readFileSync, rmSync } from "fs";
import { extractSave, SaveFile } from "../src";

const OUTPUT_PATH = `${__dirname}/temp`;

describe("extract", () => {
  beforeEach(() => {
    rmSync(OUTPUT_PATH, { recursive: true, force: true });
  });

  describe("when normalize is used", () => {
    it("all numbers are rounded to the 4th digit", () => {
      const saveFile = readSaveFile("normalize");

      extractSave(saveFile, { output: OUTPUT_PATH, normalize: true });

      expectExtractedDirectoryToBeLike("normalize");
    });
  });

  describe("when duplicate GUIDs and same name/nicknames are used", () => {
    it("the duplicated objects are still present", () => {
      const saveFile = readSaveFile("duplicates");

      extractSave(saveFile, { output: OUTPUT_PATH });

      expectExtractedDirectoryToBeLike("duplicates");
    });
  });
});

const readSaveFile = (name: string): SaveFile => {
  const content = readFileSync(`${__dirname}/saves/${name}.json`, { encoding: "utf-8" });
  return JSON.parse(content) as SaveFile;
};

const expectExtractedDirectoryToBeLike = (name: string) => {
  expectDirectoryToBeLike(name, "");
};

const expectDirectoryToBeLike = (testCase: string, path: string) => {
  const expectedPath = `${__dirname}/extracted/${testCase}/${path}`;
  const extractedPath = `${OUTPUT_PATH}/${path}`;
  console.log("Checking " + path);

  for (const dir of readdirSync(expectedPath, { withFileTypes: true })) {
    if (dir.isDirectory()) {
      expectDirectoryToBeLike(testCase, `${path}/${dir.name}`);
    } else {
      const elementPath = dir.name;
      let content, otherContent;
      expect(() => {
        content = readFileSync(`${expectedPath}/${elementPath}`, { encoding: "utf-8" });
        otherContent = readFileSync(`${extractedPath}/${elementPath}`, { encoding: "utf-8" });
      }).not.toThrow();

      assert.equal(content, otherContent, `${path}/${elementPath}`);
    }
  }
};
