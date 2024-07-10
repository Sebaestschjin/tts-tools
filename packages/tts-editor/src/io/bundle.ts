import { bundle, unbundle } from "@tts-tools/xmlbundle";
import { existsSync, lstatSync } from "fs";
import * as luabundle from "luabundle";
import { sep as pathSeparator } from "path";

import { readMetadata } from "luabundle/metadata";

export const unbundleLua = (content: string) => {
  const isBundled = readMetadata(content) !== null;
  if (isBundled) {
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

export const unbundleXml = (content: string) => {
  return unbundle(content);
};

export const bundleXml = async (script: string, includePath: string): Promise<string> => {
  return bundle(script, includePath);
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
