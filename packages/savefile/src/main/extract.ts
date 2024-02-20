import Big from "big.js";
import { mkdirSync, readFileSync } from "fs";
import stringify, { Element } from "json-stable-stringify";

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

const FLOATING_MARKER = ">>floating-point<<";
const DEFAULT_ROUNDING = 4;

/**
 * Available options for [[extractSave]].
 */
export interface Options {
  /** The path where the save file will be extracted to. */
  output: string;

  /** If set, floating point values will be rounded to the 4th decimal point. */
  normalize?: boolean | number;
  withState?: boolean;
  metadataField?: string;
  contentsPath?: string;
  statesPath?: string;
  childrenPath?: string;
  keyOrder?: string[];

  /** File extension for scripts */
  scriptExtension?: "ttslua" | "lua";
}

const state = {
  files: new Map<string, Map<string, number>>(),
};

export const readSave = (path: string): SaveFile => {
  let content = readFileSync(path, { encoding: "utf-8" });
  content = content.replace(/^(\s*"[\w]+": )(-?\d+(?:\.\d+(?:[eE]-\d+)?)?)($|,)/gm, `$1"${FLOATING_MARKER}$2"$3`);
  return JSON.parse(content) as SaveFile;
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
  const unbundledSave = unbundleSave(saveFile);
  writeExtractedSave(unbundledSave, options);
  return unbundledSave;
};

export const writeExtractedSave = (saveFile: SaveFile, options: Options) => {
  clearState();
  mkdirSync(options.output, { recursive: true });

  extractScripts(saveFile, options.output, options);
  extractContent(saveFile.ObjectStates, options.output + "/", options);
  extractData(saveFile, options.output, options);
};

export const writeExtractedObject = (object: TTSObject, options: Options) => {
  clearState();

  const objectPath = `${options.output}/${getDirectoryName(object)}`;
  mkdirSync(objectPath, { recursive: true });

  extractObject(object, objectPath, options);
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

  extractScripts(object, path, options);
  if (object.ContainedObjects) {
    extractContent(object.ContainedObjects, path, options);
  }
  extractStates(object, path, options);
  extractChildren(object, path, options);
  extractData(object, path, options);
};

const extractScripts = (object: TTSObject | SaveFile, path: string, options: Options) => {
  if (object.LuaScript) {
    const ext = options.scriptExtension || "ttslua";
    writeFile(`${path}/Script.${ext}`, object.LuaScript);
  }

  if (object.LuaScriptState && options.withState) {
    writeFile(`${path}/State.txt`, object.LuaScriptState);
  }

  if (options.metadataField) {
    const metadata = object[options.metadataField];
    if (metadata) {
      writeFile(`${path}/Metadata.toml`, metadata);
    }
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

const extractData = (object: TTSObject | SaveFile, path: string, options: Options) => {
  const replacer = (key: string, value: any) => dataReplacer(key, value, options);

  let dataContent;
  if (options.keyOrder) {
    dataContent = stringify(object, {
      replacer: replacer,
      space: 2,
      cmp: (a, b) => keyOrderer(a, b, options.keyOrder!),
    });
  } else {
    dataContent = JSON.stringify(object, replacer, 2);
  }

  dataContent = dataContent.replace(new RegExp(`"${FLOATING_MARKER}([^"]+)"`, "g"), "$1");

  writeFile(`${path}/Data.json`, dataContent);
};

const dataReplacer = (key: string, value: any, options: Options) => {
  if (HANDLED_KEYS.includes(key) || key === options.metadataField) {
    return undefined;
  }

  if (options.normalize && typeof value === "string" && value.startsWith(FLOATING_MARKER)) {
    const roundTo = typeof options.normalize === "number" ? options.normalize : DEFAULT_ROUNDING;
    const actualValue = value.slice(FLOATING_MARKER.length);
    const numericValue = Big(actualValue).round(roundTo);
    return `${FLOATING_MARKER}${numericValue}`;
  }

  return value;
};

const keyOrderer = (a: Element, b: Element, keyOrder: string[]) => {
  const aOrder = keyOrder.indexOf(a.key);
  const bOrder = keyOrder.indexOf(b.key);
  if (aOrder > -1) {
    return bOrder == -1 ? -1 : aOrder > bOrder ? 1 : -1;
  }

  return bOrder == -1 ? a.key.localeCompare(b.key) : 1;
};

const getDirectoryName = (object: TTSObject): string => {
  return `${object.Nickname.length > 0 ? object.Nickname : object.Name}.${object.GUID}`
    .replace(/[^\w \^&'@{}\[\],$=!\-#()%\.+~_]/g, "-");
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
