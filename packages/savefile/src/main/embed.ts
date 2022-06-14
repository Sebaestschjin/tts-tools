import { readFileSync } from "fs";
import { luaBundle, xmlBundle } from "./bundle";
import { ContentsFile, StatesFile } from "./model/tool";
import { SaveFile, TTSObject } from "./model/tts";

/**
 * Available options for [[embedSave]].
 */
export interface Options {
  /** The path where the scripts and XML files will be included from. */
  includePath: string;
}

/**
 * Embeds the content of an previously extracted save file and returns a new save file.
 *
 * @param path The path to an extracted save file.
 * @param options The [[Options]] to use.
 * @returns The embedded save file.
 */
export const embedSave = (path: string, options: Options): SaveFile => {
  const saveFile = readData(path) as SaveFile;

  saveFile.LuaScript = readScript(path, options);
  saveFile.LuaScriptState = readScriptState(path);
  saveFile.XmlUI = readUi(path, options);
  saveFile.ObjectStates = readContents(path, options) ?? [];

  return saveFile;
};

const readData = (path: string) => {
  return readJson(path, "Data.json", true);
};

const readObject = (path: string, options: Options): TTSObject => {
  const data = readData(path) as TTSObject;
  data.LuaScript = readScript(path, options);
  data.LuaScriptState = readScriptState(path);
  data.XmlUI = readUi(path, options);

  data.ContainedObjects = readContents(path, options);
  data.States = readStates(path, options);

  return data;
};

const readContents = (path: string, options: Options): TTSObject[] | undefined => {
  const contents = readJson<ContentsFile>(path, "Contents.json");
  if (!contents) {
    return undefined;
  }

  return contents.map((e) => readObject(`${path}/${e.path}`, options));
};

const readStates = (path: string, options: Options): Record<string, TTSObject> | undefined => {
  const states = readJson<StatesFile>(path, "States.json");
  if (!states) {
    return undefined;
  }

  return Object.entries(states).reduce((obj, [id, item]) => {
    return {
      ...obj,
      [id]: readObject(`${path}/${item.path}`, options),
    };
  }, {});
};

const readScript = (path: string, options: Options): string => {
  const script = readFile(path, "Script.ttslua");
  return script ? luaBundle(script, options.includePath) : "";
};

const readScriptState = (path: string): string => {
  return readFile(path, "State.txt");
};

const readUi = (path: string, options: Options): string => {
  const ui = readFile(path, "UI.xml");
  return ui ? xmlBundle(ui, options.includePath) : "";
};

const readFile = (path: string, fileName: string, required: boolean = false) => {
  try {
    return readFileSync(`${path}/${fileName}`, { encoding: "utf-8" });
  } catch (e) {
    if (!required && (e as any).code === "ENOENT") {
      return "";
    }

    throw e;
  }
};

const readJson = <T>(path: string, fileName: string, required: boolean = false) => {
  const content = readFile(path, fileName, required);
  if (content) {
    return JSON.parse(content) as T;
  }
};
