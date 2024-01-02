import { readFileSync, rmSync } from "fs";
import { describe, it, expect } from "vitest";

import { SaveFile } from "../main";
import { Options, embedSave } from "../main/embed";
import { extractedPath, MatcherResult, outputPath, RES_PATH } from "./config";

describe("embed", () => {
  describe("when extracted save file is used", () => {
    it("is embedded correctly", () => {
      runTestCase("normalize");
    });
  });

  describe("when an extracted save with duplicates is embedded", () => {
    it("the duplicates are part of the save file", () => {
      runTestCase("duplicates");
    });
  });

  describe("when an extracted save with specific paths is embedded", () => {
    it("the paths are resolved correctly", () => {
      runTestCase("specificPaths");
    });
  });

  describe("when metadata exists", () => {
    it("the metadata is embedded", () => {
      runTestCase("metadata", {
        metadataField: "GMNotes",
      });
    });
  });
});

const runTestCase = (name: string, options: Omit<Options, "includePath"> = {}) => {
  clearOutput(name);
  const saveFile = readSaveFile(name);

  const result = embedSave(extractedPath(name), { ...options, includePath: "" });

  expect(result).toMatchSave(saveFile);
};

const clearOutput = (name: string) => {
  rmSync(outputPath(name), { recursive: true, force: true });
};

const readSaveFile = (name: string): SaveFile => {
  const content = readFileSync(`${RES_PATH}/saves/${name}.json`, { encoding: "utf-8" });
  return JSON.parse(content) as SaveFile;
};

expect.extend({
  toMatchSave: (recieved: SaveFile, expected: SaveFile) => {
    const matchObject = (recieved: any, expected: any, parent: string): MatcherResult => {
      for (const [key, value] of Object.entries(expected)) {
        const recievedValue = recieved[key];
        const fullKeyName = parent ? `${parent}.${key}` : key;

        if (recievedValue === undefined || recievedValue === null) {
          return { pass: false, message: () => `Expected key ${fullKeyName} to be present.` };
        }

        const valueType = typeof value;
        if (valueType !== typeof recievedValue) {
          return {
            pass: false,
            message: () =>
              `Expected key ${fullKeyName} to be of type ${typeof value}, but was ${typeof recievedValue}.`,
          };
        }

        let valueMatch: { pass: boolean; message: () => string };
        if (valueType === "object") {
          valueMatch = matchObject(value, recievedValue, fullKeyName);
        } else if (valueType === "number") {
          valueMatch = {
            pass: Math.abs((value as number) - recievedValue) <= 0.0001,
            message: () =>
              `Expected "${fullKeyName}" to be equal ${value} (with a tolerance of 0.0001), but was ${recievedValue}`,
          };
        } else {
          valueMatch = {
            pass: value === recievedValue,
            message: () => `Expected "${fullKeyName}" to be equal ${value}, but was ${recievedValue}`,
          };
        }

        if (!valueMatch.pass) {
          return valueMatch;
        }
      }

      const other = Object.entries(recieved).filter(
        ([key, value]) => !Object.keys(expected).includes(key) && !isEmpty(value)
      );

      if (other.length > 0) {
        const keys = other.map(([k]) => k);
        return {
          pass: false,
          message: () => `Expected no additonal non-empty attributes, but found ${keys.join(", ")}`,
        };
      }

      return { pass: true, message: () => "" };
    };

    return matchObject(recieved, expected, "");
  },
});

const isEmpty = (v: any): boolean => {
  if (Array.isArray(v)) {
    return v.length === 0;
  }
  if (typeof v === "object") {
    return Object.keys(v).length === 0;
  }

  1;
  if (typeof v === "string") {
    return v.length === 0;
  }

  return v === undefined || v === null;
};
