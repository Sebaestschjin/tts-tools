import { mkdirSync } from "fs";
import { luaUnbundle, xmlUnbundle } from "./bundle";
import { writeFile, writeJson } from "./io";
import { ContentsFile, StatesFile } from "./model/tool";
import { SaveFile, TTSObject } from "./model/tts";

/**
 * Available options for [[extractSave]].
 */
export interface Options {
  /** The path where the save file will be extracted to. */
  output: string;

  /** If set, floating point values will be rounded to the 4th decimal point. */
  normalize?: boolean;
}

/**
 * Extracts the given `saveFile`, by splitting the data into a nested directory structure.
 *
 * @param saveFile The save file to extract.
 * @param options The [[Options]] to use.
 */
export const extractSave = (saveFile: SaveFile, options: Options) => {
  mkdirSync(options.output, { recursive: true });

  extractScripts(saveFile, options.output);
  extractContent(saveFile.ObjectStates, options.output + "/", options);

  saveFile.ObjectStates = [];
  extractData(saveFile, options.output, options.normalize);
  if (options.normalize) {
    normalizeData(saveFile);
  }
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
    object.ContainedObjects = [];
  }
  extractStates(object, path, options);
  extractData(object, path, options.normalize);
};

const extractScripts = (object: TTSObject | SaveFile, path: string) => {
  if (object.LuaScript) {
    try {
      const script = luaUnbundle(object.LuaScript);
      writeFile(`${path}/Script.ttslua`, script);
      object.LuaScript = "";
    } catch (e) {
      console.log(e);
    }
  }

  if (object.LuaScriptState) {
    writeFile(`${path}/State.txt`, object.LuaScriptState);
    object.LuaScriptState = "";
  }

  if (object.XmlUI) {
    const ui = xmlUnbundle(object.XmlUI);
    writeFile(`${path}/UI.xml`, ui);
    object.XmlUI = "";
  }
};

const extractContent = (objects: TTSObject[], path: string, options: Options) => {
  const contents: ContentsFile = [];
  const files = new Map<string, number>();

  objects.forEach((object, index) => {
    let objectDirectory = getDirectoryName(object);

    const existing = files.get(objectDirectory);
    if (existing) {
      files.set(objectDirectory, existing + 1);
      objectDirectory += `.${existing}`;
    } else {
      files.set(objectDirectory, 1);
    }

    const contentsPath = `Contents/${objectDirectory}`;
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
    const objectDirectory = getDirectoryName(state);
    const statePath = `States/${id}-${objectDirectory}`;
    states[id] = {
      path: statePath,
    };
    extractObject(state, `${path}/${statePath}`, options);
  });

  object.States = {};
  writeJson(`${path}/States.json`, states);
};

const extractData = (object: TTSObject | SaveFile, path: string, normalize: boolean = false) => {
  if (normalize) {
    normalizeData(object);
  }
  writeJson(`${path}/Data.json`, object);
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

const round = (value: any, digits: number = 4) => {
  const offset = Math.pow(10, digits);
  return Math.floor(value * offset) / offset;
};
