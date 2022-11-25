import { writeFileSync } from "fs";

/**
 * Writes the given `content` into a file at the given `path`.
 *
 * @param path Path to write to.
 * @param content The content to write.
 */
export const writeFile = (path: string, content: string) => {
  writeFileSync(path, content, { encoding: "utf-8" });
};

/**
 * Converts `content` into a JSON string and writes it into a file.
 *
 * @param path Path to write to.
 * @param content The content to write.
 */
export const writeJson = (path: string, content: any) => {
  const jsonContent = JSON.stringify(content, null, 2) + "\n";
  writeFile(path, jsonContent);
};
