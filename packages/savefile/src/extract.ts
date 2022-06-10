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
  extractScripts(saveFile, options.output);
  extractContent(saveFile.ObjectStates, options.output + "/", options);

  saveFile.ObjectStates = [];
  extractData(saveFile, options.output, options.normalize);
};

/**
 * @param object The object to Extract
 * @param path Current nested path where files for this object will be placed at
 */
const extractObject = (object: TTSObject, path: string, options: Options) => {
  const objectDirectory = getDirectoryName(object);
  const currentPath = `${path}${objectDirectory}`;
  mkdirSync(currentPath, { recursive: true });

  extractScripts(object, currentPath);
  if (object.ContainedObjects) {
    extractContent(object.ContainedObjects, currentPath, options);
    object.ContainedObjects = [];
  }
  extractStates(object, currentPath, options);
  extractData(object, currentPath, options.normalize);
};

const extractScripts = (object: TTSObject | SaveFile, path: string) => {
  if (object.LuaScript) {
    const script = luaUnbundle(object.LuaScript);
    writeFile(`${path}/Script.ttslua`, script);
    object.LuaScript = "";
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
  objects.forEach((object, index) => {
    const contentsPath = `Contents/${getDirectoryName(object)}`;
    contents.push({
      path: contentsPath,
    });
    extractObject(object, `${path}/Contents/`, options);
  });
  writeJson(`${path}/Contents.json`, contents);
};

const extractStates = (object: TTSObject, path: string, options: Options) => {
  if (object.States) {
    const states: StatesFile = [];
    const content = Object.entries(object.States).forEach(([id, state]) => {
      const statePath = `States/${id}-${getDirectoryName(state)}`;
      states.push({
        id: id,
        path: statePath,
      });
      extractObject(state, `${path}/States/${id}-`, options);
    });
    object.States = {};
    writeJson(`${path}/States.json`, states);
  }
};

const extractData = (object: TTSObject | SaveFile, path: string, normalize: boolean = false) => {
  if (normalize) {
    normalizeData(object);
  }
  writeJson(`${path}/Data.json`, object);
};

const normalizeData = (object: any) => {
  if (object.Transform) {
    object.Transform.posX = round(object.Transform.posX, 2);
    object.Transform.posY = round(object.Transform.posY, 2);
    object.Transform.posZ = round(object.Transform.posZ, 2);
    object.Transform.rotX = round(object.Transform.rotX, 1);
    object.Transform.rotY = round(object.Transform.rotY, 1);
    object.Transform.rotZ = round(object.Transform.rotZ, 1);
    object.Transform.scaleX = round(object.Transform.scaleX, 2);
    object.Transform.scaleY = round(object.Transform.scaleY, 2);
    object.Transform.scaleZ = round(object.Transform.scaleZ, 2);
  }

  if (object.ChildObjects) {
    object.ChildObjects.forEach((c: any) => normalizeData(c));
  }
};

const getDirectoryName = (object: TTSObject): string => {
  let objectPath = (object.Nickname || object.Name) + "." + object.GUID;
  return objectPath.replace(/[/\\?%*:|"<>]/g, "-");
};

const round = (value: any, digits: number = 4) => {
  const offset = Math.pow(10, digits);
  return Math.round(value * offset) / offset;
};
