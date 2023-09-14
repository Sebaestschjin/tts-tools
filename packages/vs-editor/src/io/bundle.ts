import { bundle, unbundle } from "@tts-tools/xmlbundle";
import * as luabundle from "luabundle";
import { Uri } from "vscode";

import * as tstl from "typescript-to-lua";

import { readFile } from "./files";

export const runTstl = (path: string) => {
  return tstl.transpileProject(`${path}/tsconfig.json`);
};

export const unbundleLua = (content: string) => {
  const unbundled = luabundle.unbundleString(content, { rootOnly: true });
  return unbundled.modules[unbundled.metadata.rootModuleName].content;
};

export const bundleLua = async (file: Uri, includePaths: string[]): Promise<string> => {
  const script = await readFile(file);

  return luabundle.bundleString(script, {
    paths: includePaths,
    isolate: true,
  });
};

export const unbundleXml = (content: string) => {
  return unbundle(content);
};

export const bundleXml = async (file: Uri, includePath: string): Promise<string> => {
  const script = await readFile(file);

  return bundle(script, includePath);
};
