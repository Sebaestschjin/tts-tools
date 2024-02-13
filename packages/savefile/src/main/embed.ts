import { readFileSync } from "fs";
import { bundleSave } from "./bundle";
import { ChildObjectsFile, ContentsFile, StatesFile } from "./model/tool";
import { SaveFile, TTSObject } from "./model/tts";

/**
 * Available options for [[embedSave]].
 */
export interface Options {
  /** The path where the scripts and XML files will be included from. */
  includePaths: string[];
  metadataField?: string;

  /** File extension for scripts */
  scriptExtension?: "ttslua" | "lua";
  luaPatterns?: string[];
}

export const readExtractedSave = (path: string, options: Options) => {
  const saveFile = readData(path, options) as SaveFile;

  saveFile.LuaScript = readScript(path, options);
  saveFile.LuaScriptState = readScriptState(path);
  saveFile.XmlUI = readUi(path);
  saveFile.ObjectStates = readContents(path, options) ?? [];

  return saveFile;
};

/**
 * Embeds the content of an previously extracted save file and returns a new save file.
 *
 * @param path The path to an extracted save file.
 * @param options The [[Options]] to use.
 * @returns The embedded save file.
 */
export const embedSave = (path: string, options: Options): SaveFile => {
  const saveFile = readExtractedSave(path, options);
  return bundleSave(saveFile, options);
};

const readData = (path: string, options: Options) => {
  return readJson(path, "Data.json", true);
};

const readObject = (path: string, options: Options): TTSObject => {
  const data = readData(path, options) as TTSObject;
  data.LuaScript = readScript(path, options);
  data.LuaScriptState = readScriptState(path);
  data.XmlUI = readUi(path);

  if (options.metadataField) {
    const metadata = readMetadata(path);
    if (metadata !== "") {
      data[options.metadataField] = metadata;
    }
  }

  data.ContainedObjects = readContents(path, options);
  data.States = readStates(path, options);
  data.ChildObjects = readChildObjects(path, options);

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

const readChildObjects = (path: string, options: Options): TTSObject[] | undefined => {
  const children = readJson<ChildObjectsFile>(path, "Children.json");
  if (!children) {
    return undefined;
  }

  return children.map((e) => readObject(`${path}/${e.path}`, options));
};

const readScript = (path: string, options: Options): string => {
  const ext = options.scriptExtension || "ttslua";
  return readFile(path, `Script.${ext}`);
};

const readScriptState = (path: string): string => {
  return readFile(path, "State.txt");
};

const readUi = (path: string): string => {
  return readFile(path, "UI.xml");
};

const readMetadata = (path: string): string => {
  return readFile(path, "Metadata.toml");
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
