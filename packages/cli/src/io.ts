import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join as joinPath } from "path";

export const findSaveFilePath = (root: string, path: string, recursive: boolean): string | undefined => {
  const fullPath = joinPath(root, path);

  if (existsSync(fullPath)) {
    return fullPath;
  }

  if (recursive) {
    const subDirectories = readdirSync(root, { withFileTypes: true, encoding: "utf-8" }).filter((d) => d.isDirectory());

    for (const sub of subDirectories) {
      const found = findSaveFilePath(joinPath(root, sub.name), path, recursive);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
};

export const getTtsDirectory = () => {
  const home = homedir();
  const documentsDir = process.platform === "win32" ? joinPath(home, "Documents") : home;
  return joinPath(documentsDir, "My Games/Tabletop Simulator/Saves");
};
