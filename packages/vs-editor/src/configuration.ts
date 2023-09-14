import { join } from "path";
import { Uri, workspace } from "vscode";

const Config = {
  Name: "ttsEditor",
  IncludePath: "includePath",
  UseTSTL: "tstl.enable",
  TSTLPath: "tstl.path",
};

const includePatterns = () => {
  return ["?.ttslua", "?.lua"];
};

const includePaths = (): string[] => {
  const patterns = includePatterns();
  const paths = workspace.workspaceFolders ?? [];
  const result: Uri[] = [];

  const relative = getConfig<string>(Config.IncludePath);

  paths
    .map((w) => Uri.joinPath(w.uri, `/${relative}`))
    .forEach((path) => {
      patterns.forEach((pattern) => {
        result.push(Uri.joinPath(path, pattern));
      });
    });

  return result.map((u) => u.fsPath);
};

const tstlEnalbed = (): boolean => getConfig(Config.UseTSTL);

const tstlPath = (): string => getConfig(Config.TSTLPath);

const getConfig = <T>(name: string) => {
  const config = workspace.getConfiguration(Config.Name);
  return config.get(name) as T;
};

export default {
  includePaths,
  useTSTL: tstlEnalbed,
  tstlPath,
};
