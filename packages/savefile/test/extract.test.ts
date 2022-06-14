import assert = require("assert");
import { readdirSync, readFileSync, rmSync } from "fs";
import { extractSave, SaveFile } from "../src";

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

const OUTPUT_PATH = `${__dirname}/temp`;

const extractedPath = (name: string) => {
  return `${__dirname}/extracted/${name}`;
};

describe("extract", () => {
  beforeEach(() => {
    rmSync(OUTPUT_PATH, { recursive: true, force: true });
  });

  describe("when normalize is used", () => {
    it("all numbers are rounded to the 4th digit", () => {
      const saveFile = readSaveFile("normalize");

      extractSave(saveFile, { output: OUTPUT_PATH, normalize: true });

      expect(OUTPUT_PATH).toMatchDirectory(extractedPath("normalize"));
    });
  });

  describe("when duplicate GUIDs and same name/nicknames are used", () => {
    it("the duplicated objects are still present", () => {
      const saveFile = readSaveFile("duplicates");

      extractSave(saveFile, { output: OUTPUT_PATH });

      expect(OUTPUT_PATH).toMatchDirectory(extractedPath("duplicates"));
    });
  });

  describe("when the save file contains objects with states", () => {
    it("the states are extracted", () => {
      const saveFile = readSaveFile("stated");

      extractSave(saveFile, { output: OUTPUT_PATH });

      expect(OUTPUT_PATH).toMatchDirectory(extractedPath("stated"));
    });
  });
});

const readSaveFile = (name: string): SaveFile => {
  const content = readFileSync(`${__dirname}/saves/${name}.json`, { encoding: "utf-8" });
  return JSON.parse(content) as SaveFile;
};

expect.extend({
  toMatchDirectory: (recievedPath: string, expectedPath: string) => {
    const matchDirectory = (recievedPath: string, expectedPath: string): MatcherResult => {
      for (const dir of readdirSync(expectedPath, { withFileTypes: true })) {
        const recievedDir = `${recievedPath}/${dir.name}`;
        const expectedDir = `${expectedPath}/${dir.name}`;

        if (dir.isDirectory()) {
          const subMatch = matchDirectory(`${recievedDir}`, `${expectedDir}`);
          if (!subMatch.pass) {
            return subMatch;
          }
        } else {
          const elementPath = dir.name;
          const content = readFileSync(`${expectedDir}`, { encoding: "utf-8" });
          let receivedContent;
          try {
            receivedContent = readFileSync(`${recievedDir}`, { encoding: "utf-8" });
          } catch (e) {
            return { pass: false, message: () => `Expected path ${recievedDir} to exist.` };
          }

          try {
            if (elementPath.endsWith(".json")) {
              assert.deepEqual(JSON.parse(receivedContent), JSON.parse(content));
            } else {
              assert.equal(receivedContent, content);
            }
          } catch (e) {
            return { pass: false, message: () => `Expected content of ${recievedDir} to match ${expectedDir}.` };
          }
        }
      }
      return { pass: true, message: () => "" };
    };

    return matchDirectory(recievedPath, expectedPath);
  },
});
