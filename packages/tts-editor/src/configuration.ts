import { Uri, workspace } from "vscode";

const configName = {
  name: "ttsEditor",
  includePath: "includePath",
  useMessages: "enableMessages",
};

const includePatterns = () => {
  return ["?.ttslua", "?.lua"];
};

const includePaths = (): Uri[] => {
  const paths = workspace.workspaceFolders ?? [];
  const relative = getConfig<string>(configName.includePath);
  return paths.map((w) => Uri.joinPath(w.uri, `/${relative}`));
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

const xmlIncludePath = (): string => {
  return includePaths().map((u) => u.fsPath)[0];
};

const messagesEnabled = (): boolean => getConfig(configName.useMessages);

const getConfig = <T>(name: string) => {
  const config = workspace.getConfiguration(configName.name);
  return config.get(name) as T;
};

export default {
  luaIncludePaths,
  xmlIncludePath,
  messagesEnabled,
};
