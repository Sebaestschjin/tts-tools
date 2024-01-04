import { bundle, unbundle } from "@tts-tools/xmlbundle";
import * as luabundle from "luabundle";

import * as tstl from "typescript-to-lua";

import { readMetadata } from "luabundle/metadata";

export const runTstl = (path: string) => {
  return tstl.transpileProject(`${path}/tsconfig.json`);
};

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
  });
};

export const unbundleXml = (content: string) => {
  return unbundle(content);
};

export const bundleXml = async (script: string, includePath: string): Promise<string> => {
  return bundle(script, includePath);
};
