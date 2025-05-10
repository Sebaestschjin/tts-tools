import { bundle, unbundle } from "@tts-tools/xmlbundle";
import { existsSync, lstatSync } from "fs";
import * as luabundle from "luabundle";
import { sep as pathSeparator } from "path";

import { readMetadata } from "luabundle/metadata";
import { UnbundledData } from "luabundle";

/**
 * @returns `true` if the given Lua string was bundled by luabundle, `false` otherwise.
 */
export const isBundled = (content: string): boolean => readMetadata(content) !== null;

export const unbundleLua = (content: string): UnbundledData => {
  return luabundle.unbundleString(content);
};

export const unbundleRootModule = (content: string) => {
  if (isBundled(content)) {
    const unbundled = luabundle.unbundleString(content, { rootOnly: true });
    return unbundled.modules[unbundled.metadata.rootModuleName].content;
  }

  return content;
};

export const bundleLua = async (script: string, includePaths: string[]): Promise<string> => {
  return luabundle.bundleString(script, {
    paths: includePaths,
    isolate: true,
    resolveModule,
  });
};

interface BundleInfo {
  name: string;
  offset: number;
}

/**
 * @param source The bundled Lua script.
 * @param lineNumber The line number to start searching.
 * @returns The nearest bundle name of the Lua source starting from the given `lineNumber`.
 *          Returns `undefined` if no bundle can be found.
 */
export const findNearestBundle = async (source: string, lineNumber: number): Promise<Maybe<BundleInfo>> => {
  const lines = source.split("\n");
  for (let i = lineNumber - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(/^__bundle_register\("([^"]+)"/);
    if (match) {
      return { name: match[1], offset: i + 1 };
    }
  }

  return undefined;
};

/**
 * @param source A bundled Lua script.
 * @returns The name of the root bundle for the given bundled Lua.
 */
export const getRootName = (source: string): string => {
  const unbundled = luabundle.unbundleString(source, { rootOnly: true });
  return unbundled.metadata.rootModuleName;
};

export const unbundleXml = (content: string) => {
  return unbundle(content);
};

export const bundleXml = async (script: string, includePaths: string[]): Promise<string> => {
  return bundle(script, includePaths);
};

const resolveModule = (name: string, packagePaths: readonly string[]) => {
  const platformName = name.replace(/\./g, pathSeparator);

  for (const pattern of packagePaths) {
    const filePath = pattern.replace(/\?/g, platformName);

    if (existsSync(filePath) && lstatSync(filePath).isFile()) {
      return filePath;
    }

    const indexPath = pattern.replace(/\?/g, `${platformName}${pathSeparator}index`);
    console.log(indexPath);
    if (existsSync(indexPath) && lstatSync(indexPath).isFile()) {
      return indexPath;
    }
  }

  return null;
};
