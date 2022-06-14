import assert = require("assert");
import { readFileSync, rmSync, writeFileSync } from "fs";
import { embedSave, SaveFile } from "../src";
import { isEmpty } from "../src/util";

const OUTPUT_PATH = `${__dirname}/temp`;

describe("embed", () => {
  beforeEach(() => {
    rmSync(OUTPUT_PATH, { recursive: true, force: true });
  });

  describe("when extracted save file is used", () => {
    it("is embedded correctly", () => {
      const saveFile = readSaveFile("normalize");

      const result = embedSave(`${__dirname}/extracted/normalize`, { includePath: "" });
      writeFileSync(`${__dirname}/out.json`, JSON.stringify(result, null, 2), { encoding: "utf-8" });

      expect(result).toMatchSave(saveFile);
    });
  });

  describe("when an extracted save with duplicates is embedded", () => {
    it("the duplicates are part of the save file", () => {
      const saveFile = readSaveFile("duplicates");

      const result = embedSave(`${__dirname}/extracted/duplicates`, { includePath: "" });

      expect(result).toMatchSave(saveFile);
    });
  });
});

const readSaveFile = (name: string): SaveFile => {
  const content = readFileSync(`${__dirname}/saves/${name}.json`, { encoding: "utf-8" });
  return JSON.parse(content) as SaveFile;
};

expect.extend({
  toMatchSave: (recieved: SaveFile, expected: SaveFile) => {
    const matchObject = (recieved: any, expected: any, parent: string) => {
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
