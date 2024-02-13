import { bundle as bundleXml } from "@tts-tools/xmlbundle";
import { cloneDeepWith } from "lodash";
import { bundleString } from "luabundle";

import { Options } from "./embed";
import { SaveFile, TTSObject } from "./model/tts";

import { join as pathJoin } from "path";

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

/**
 * Function factory to be used with cloneDeepWith to bundle Lua and XML scripts.
 *
 * @param options The options object.
 * @returns The cuztomizer function for cloneDeepWith.
 */
const bundler = (options: Options) => (value: any, key: string | number | undefined, obj: any) => {
  if (!value) return undefined;
  if (key === "LuaScript") {
    return luaBundle(obj.LuaScript, options.includePaths, options.luaPatterns);
  } else if (key == "XmlUI") {
    return bundleXml(value, options.includePaths);
  }
};

/**
 * Bundles the given Lua `script` by resolving `require()` calls using the given `includePaths`.
 *
 * @param script The script content.
 * @param includePaths The path array to look for additional includes.
 * @returns The bundled script.
 */
const luaBundle = (script: string, includePaths: string[], luaPatterns?: string[]): string => {
  // Default patterns to look for Lua files, can be overridden by the user
  luaPatterns = luaPatterns ?? ['?.lua', '?.ttslua'];
  // Combine both arrays to create a list of paths to look for includes
  const paths = luaPatterns.flatMap(pt => includePaths.map(p => pathJoin(p, pt)));
  // Also add the patterns directly to account for absolute paths
  paths.push(...luaPatterns);
  const bundled = bundleString(script, { paths });
  return bundled.startsWith("-- Bundled") ? bundled + "\n" : bundled;
};
