import assert = require("assert");
import commonPathPrefix from "common-path-prefix";
import { readdirSync, readFileSync, rmSync } from "fs";
import { SaveFile } from "../main";
import { extractSave, Options } from "../main/extract";
import { extractedPath, MatcherResult, outputPath, savePath } from "./config";
import path = require("path");

describe("extract", () => {
  describe("when normalize is used", () => {
    it("all numbers are rounded to the 4th digit", () => {
      runTestCase("normalize", { normalize: true });
    });
  });

  describe("when duplicate GUIDs and same name/nicknames are used", () => {
    it("the duplicated objects are still present", () => {
      runTestCase("duplicates");
    });
  });

  describe("when the save file contains objects with states", () => {
    it("the states are extracted", () => {
      runTestCase("stated");
    });
  });

  describe("when the scrippt exists", () => {
    it("the scripts are unbundled", () => {
      runTestCase("withScript");
    });
  });

  describe("when specific paths are used", () => {
    it("the objects are unbundled in those paths", () => {
      runTestCase("specificPaths", { contentsPath: "Contents", childrenPath: "Children", statesPath: "States" });
    });
  });

  describe("when a specifc key order is used", () => {
    it("the objects are saved with the given key order", () => {
      runTestCase("keyOrder", {
        keyOrder: ["Name", "GUID", "Nickname", "Description", "GMNotes", "Memo", "Tags", "Transform"],
      });
    });
  });
});

const runTestCase = (name: string, options: Omit<Options, "output"> = {}) => {
  clearOutput(name);
  const saveFile = readSaveFile(name);
  const fullOptions: Options = {
    output: outputPath(name),
    ...options,
  };
  const extracted = extractSave(saveFile, fullOptions);
  expect(extracted).not.toBe(saveFile);
  expect(outputPath(name)).toMatchDirectory(extractedPath(name));
};

const clearOutput = (name: string) => {
  rmSync(outputPath(name), { recursive: true, force: true });
};

const readSaveFile = (name: string): SaveFile => {
  const content = readFileSync(savePath(name), { encoding: "utf-8" });
  return JSON.parse(content) as SaveFile;
};

expect.extend({
  toMatchDirectory: (recievedPath: string, expectedPath: string) => {
    const matchDirectory = (recievedPath: string, expectedPath: string): MatcherResult => {
      for (const dir of readdirSync(expectedPath, { withFileTypes: true })) {
        const recievedDir = path.resolve(`${recievedPath}/${dir.name}`);
        const expectedDir = path.resolve(`${expectedPath}/${dir.name}`);

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
            const common = commonPathPrefix([recievedDir, expectedDir]);
            const receivedFile = recievedDir.replace(common, "");
            const expectedFile = expectedDir.replace(common, "");
            return { pass: false, message: () => `Expected content of <${receivedFile}> to match <${expectedFile}>.` };
          }
        }
      }
      return { pass: true, message: () => "" };
    };

    return matchDirectory(recievedPath, expectedPath);
  },
});
