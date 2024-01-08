import { Uri, workspace } from "vscode";

const configValue = {
  name: "ttsEditor",
  includePath: "includePath",
  useTSTL: "tstl.enable",
  tstlPath: "tstl.path",
};

const includePatterns = () => {
  return ["?.ttslua", "?.lua"];
};

const includePaths = (): Uri[] => {
  const paths = workspace.workspaceFolders ?? [];
  const relative = getConfig<string>(configValue.includePath);
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

const tstlEnalbed = (): boolean => getConfig(configValue.useTSTL);

const tstlPath = (): string => getConfig(configValue.tstlPath);

const getConfig = <T>(name: string) => {
  const config = workspace.getConfiguration(configValue.name);
  return config.get(name) as T;
};

export default {
  luaIncludePaths,
  xmlIncludePath,
  tstlEnalbed,
  tstlPath,
};
