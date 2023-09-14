import { Uri, workspace } from "vscode";

import { bundle, unbundle } from "@tts-tools/xmlbundle";
import * as luabundle from "luabundle";
import { includeOtherFiles, includePaths } from "./configuration";

export const unbundleLua = (content: string) => {
  const unbundled = luabundle.unbundleString(content, { rootOnly: true });
  return unbundled.modules[unbundled.metadata.rootModuleName].content;
};

export const bundleLua = async (file: Uri): Promise<string> => {
  const script = await readFile(file);

  if (includeOtherFiles()) {
    return luabundle.bundleString(script, {
      paths: includePaths(),
      isolate: true,
    });
  }

  return script;
};

export const unbundleXml = (content: string) => {
  if (includeOtherFiles()) {
    return unbundle(content);
  }

  return content;
};

export const bundleXml = async (file: Uri): Promise<string> => {
  const script = await readFile(file);

  if (includeOtherFiles()) {
    return bundle(script, includePaths()[0]);
  }

  return script;
};

const readFile = async (file: Uri) =>
  workspace.fs
    .readFile(file)
    .then(Buffer.from)
    .then((b) => b.toString("utf-8"));
