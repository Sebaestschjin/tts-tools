import { bundle as bundleXml } from "@tts-tools/xmlbundle";
import { cloneDeepWith } from "lodash";
import { bundleString } from "luabundle";

import { Options } from "./embed";
import { SaveFile, TTSObject } from "./model/tts";
import { join } from "path";

/**
 * Creates a copy of the given save file and bundles all Lua/XML scripts with the given options.
 */
export const bundleSave = (saveFile: SaveFile, options: Options) => {
  return cloneDeepWith(saveFile, bundler(options));
};

/**
 * Create a copy of the given object and bundles its own and contained Lua/XML scripts with the given options.
 */
export const bundleObject = (object: TTSObject, options: Options) => {
  return cloneDeepWith(object, bundler(options));
};

const bundler = (options: Options) => {
  return (value: any, key: string | number | undefined, obj: any) => {
    if (key === "LuaScript" && value) {
      return luaBundle(obj.LuaScript, options.includePath);
    } else if (key == "XmlUI" && value) {
      return bundleXml(value, options.includePath);
    }

    return undefined;
  };
};

/**
 * Bundles the given Lua `script` by resolving `require()` calls using the given `includePath`.
 *
 * @param script The script content.
 * @param includePaths The path to look for additional includes.
 * @returns The bundled script.
 */
const luaBundle = (script: string, includePaths: string | string[]): string => {
  if (typeof includePaths === "string") {
    includePaths = [includePaths];
  }

  const patterns = ["?.lua", "?.ttslua"];
  const paths = includePaths.flatMap((path) => patterns.map((pattern) => join(path, pattern)));
  paths.push(...patterns);

  const bundled = bundleString(script, { paths });

  return bundled.startsWith("-- Bundled") ? bundled + "\n" : bundled;
};
