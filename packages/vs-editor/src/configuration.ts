import { join } from "path";
import { workspace } from "vscode";

const configName = "TTSEditor";

export const includeOtherFiles = (): boolean => getConfig("includeOtherFiles") ?? false;

export const includePaths = (): string[] => {
  const patterns = includePatterns();
  const paths = getConfig<string[]>("includeOtherFilesPaths");
  const result: string[] = [];

  paths.forEach((path) => {
    patterns.forEach((pattern) => {
      result.push(join(path, pattern));
    });
  });

  return result;
};

const autoOpen = (): string => getConfig("autoOpen");

const createXml = (): boolean => getConfig("createXml");

const includePatterns = () => {
  const patterns = getConfig<string[]>("bundleSearchPattern") || [];
  return patterns.filter((p) => p.length > 0);
};

const getConfig = <T>(name: string) => {
  const config = workspace.getConfiguration(configName);
  return config.get(name) as T;
};

export default {
  autoOpen,
  createXml,
};
