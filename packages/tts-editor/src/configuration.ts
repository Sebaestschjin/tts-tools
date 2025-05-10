import { Uri, workspace } from "vscode";

import { getOutputPath } from "./io/files";

const configName = {
  name: "ttsEditor",
  includePath: "includePath",
  useMessages: "enableMessages",
};

const includePatterns = () => {
  return ["?.lua", "?.ttslua"];
};

const includePaths = (): Uri[] => {
  const paths = workspace.workspaceFolders ?? [];
  const relative = getConfig<string>(configName.includePath);
  const libraryPath = getOutputPath("library");

  return [...paths.map((w) => Uri.joinPath(w.uri, `/${relative}`)), libraryPath];
};

const luaIncludePaths = (): string[] => {
  const patterns = includePatterns();

  const result: Uri[] = [];
  includePaths().forEach((path) => {
    patterns.forEach((pattern) => {
      result.push(Uri.joinPath(path, pattern));
    });
  });

  return result.map((u) => u.fsPath);
};

const xmlIncludePaths = (): string[] => {
  return includePaths().map((u) => u.fsPath);
};

const messagesEnabled = (): boolean => getConfig(configName.useMessages);

const getConfig = <T>(name: string) => {
  const config = workspace.getConfiguration(configName.name);
  return config.get(name) as T;
};

export default {
  luaIncludePaths,
  xmlIncludePaths,
  messagesEnabled,
};
