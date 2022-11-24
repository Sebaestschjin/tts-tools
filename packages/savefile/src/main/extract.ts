import { mkdirSync } from "fs";

import { writeFile, writeJson } from "./io";
import { ChildObjectsFile, ContentsFile, StatesFile } from "./model/tool";
import { SaveFile, TTSObject } from "./model/tts";
import { unbundleSave } from "./unbundle";

const HANDLED_KEYS = [
  "LuaScript",
  "LuaScriptState",
  "XmlUI",
  "ContainedObjects",
  "ObjectStates",
  "States",
  "ChildObjects",
];

/**
 * Available options for [[extractSave]].
 */
export interface Options {
  /** The path where the save file will be extracted to. */
  output: string;

  /** If set, floating point values will be rounded to the 4th decimal point. */
  normalize?: boolean;

  contentsPath?: string;
  statesPath?: string;
  childrenPath?: string;
}

const state = {
  files: new Map<string, Map<string, number>>(),
};

/**
 * Extracts the given `saveFile`, by splitting the data into a nested directory structure.
 * It also returns an unbundled version of the save file.
 *
 * @param saveFile The save file to extract.
 * @param options The [[Options]] to use.
 * @returns The unbundled/normalized version of the save file
 */
export const extractSave = (saveFile: SaveFile, options: Options): SaveFile => {
  clearState();
  const unbundledSave = unbundleSave(saveFile);
  writeExtractedSave(unbundledSave, options);
  return unbundledSave;
};

export const writeExtractedSave = (saveFile: SaveFile, options: Options) => {
  mkdirSync(options.output, { recursive: true });

  extractScripts(saveFile, options.output);
  extractContent(saveFile.ObjectStates, options.output + "/", options);

  extractData(saveFile, options.output, options.normalize);
  if (options.normalize) {
    normalizeData(saveFile);
  }
};

const clearState = () => {
  state.files.clear();
};

/**
 * @param object The object to Extract
 * @param path Current nested path where files for this object will be placed at
 */
const extractObject = (object: TTSObject, path: string, options: Options) => {
  mkdirSync(path, { recursive: true });

  extractScripts(object, path);
  if (object.ContainedObjects) {
    extractContent(object.ContainedObjects, path, options);
  }
  extractStates(object, path, options);
  extractChildren(object, path, options);
  extractData(object, path, options.normalize);
};

const extractScripts = (object: TTSObject | SaveFile, path: string) => {
  if (object.LuaScript) {
    writeFile(`${path}/Script.ttslua`, object.LuaScript);
  }

  if (object.LuaScriptState) {
    writeFile(`${path}/State.txt`, object.LuaScriptState);
  }

  if (object.XmlUI) {
    writeFile(`${path}/UI.xml`, object.XmlUI);
  }
};

const extractContent = (objects: TTSObject[], path: string, options: Options) => {
  const contents: ContentsFile = [];

  objects.forEach((object) => {
    const contentSubPath = options.contentsPath || ".";
    const objectDirectory = getFreeDirectoryName(object, `${path}/${contentSubPath}`);
    const contentsPath = `${contentSubPath}/${objectDirectory}`;
    contents.push({
      path: contentsPath,
    });
    extractObject(object, `${path}/${contentsPath}`, options);
  });

  writeJson(`${path}/Contents.json`, contents);
};

const extractStates = (object: TTSObject, path: string, options: Options) => {
  if (!object.States) {
    return;
  }

  const states: StatesFile = {};

  Object.entries(object.States).forEach(([id, state]) => {
    const statesSubPath = options.statesPath || ".";
    const objectDirectory = getDirectoryName(state);
    const statePath = `${statesSubPath}/${id}-${objectDirectory}`;
    states[id] = {
      path: statePath,
    };
    extractObject(state, `${path}/${statePath}`, options);
  });

  writeJson(`${path}/States.json`, states);
};

const extractChildren = (object: TTSObject, path: string, options: Options) => {
  if (!object.ChildObjects) {
    return;
  }
  console.log(path, object.GUID);
  const childObjects: ChildObjectsFile = [];
  object.ChildObjects.forEach((child) => {
    const childrenSubPath = options.childrenPath || ".";
    const objectDirectory = getDirectoryName(child);
    const childPath = `${childrenSubPath}/${objectDirectory}`;
    childObjects.push({
      path: childPath,
    });
    extractObject(child, `${path}/${childPath}`, options);
  });
  writeJson(`${path}/Children.json`, childObjects);
};

const extractData = (object: TTSObject | SaveFile, path: string, normalize: boolean = false) => {
  if (normalize) {
    normalizeData(object);
  }

  const dataContent = JSON.stringify(object, dataReplacer, 2);
  writeFile(`${path}/Data.json`, dataContent);
};

const dataReplacer = (key: string, value: string) => {
  return HANDLED_KEYS.includes(key) ? undefined : value;
};

const normalizeData = (object: any) => {
  Object.keys(object).map((key) => {
    const value = object[key];
    if (typeof value === "number") {
      object[key] = round(value, 4);
    }
    if (typeof value === "object") {
      normalizeData(value);
    }
  });
};

const getDirectoryName = (object: TTSObject): string => {
  let objectPath = (object.Nickname || object.Name) + "." + object.GUID;
  return objectPath.replace(/[/\\?%*:|"<>]/g, "-");
};

const getFreeDirectoryName = (object: TTSObject, path: string): string => {
  let objectPath = getDirectoryName(object);
  let subFiles = state.files.get(path);
  if (!subFiles) {
    subFiles = new Map();
    state.files.set(path, subFiles);
  }

  const existing = subFiles.get(objectPath);
  if (existing) {
    subFiles.set(objectPath, existing + 1);
    objectPath += `.${existing}`;
  } else {
    subFiles.set(objectPath, 1);
  }

  return objectPath;
};

const round = (value: any, digits: number = 4) => {
  const offset = Math.pow(10, digits);
  return Math.round(value * offset) / offset;
};
