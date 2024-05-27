import { existsSync, readFileSync } from "fs";

const INCLUDE_REGEX = /^([\t ]*)<Include src=(["'])(.+)\2\s*\/>/im;
const BORDER_REGEX = /(<!-- include (.*?) -->)(.*?)\1/gs;

/**
 * Bundles the given XML by resolving `Include` nodes with a `src` attribute.
 */
export const bundle = (xmlUi: string, includePath: string | string[]): string => {
  if (typeof includePath === "string") {
    includePath = [includePath];
  }

  return resolve(xmlUi, includePath, [], true);
};

/**
 * Unbundles the given XML by replacing comments generated from `bundle` with their respective `Include` node and `src` attribute.
 */
export const unbundle = (xmlUi: string): string => {
  const replacement = '<Include src="$2" />';

  return xmlUi.replaceAll(BORDER_REGEX, replacement);
};

const resolve = (xmlUi: string, rootPaths: string[], alreadyResolved: string[], topLevel: boolean) => {
  let resolved = xmlUi;
  let match = resolved.match(INCLUDE_REGEX);

  while (match) {
    let resolvedInclude = readInclude(match[3], rootPaths, alreadyResolved);
    if (topLevel) {
      alreadyResolved = [];
    }

    const indent = match[1] ?? "";
    resolvedInclude = resolvedInclude
      .split("\n")
      .map((line) => (line ? indent + line : line))
      .join("\n");

    const start = match.index!;
    const end = start + match[0].length;

    resolved = resolved.substring(0, start) + resolvedInclude + resolved.substring(end);
    match = resolved.match(INCLUDE_REGEX);
  }

  return resolved;
};

const getFilePath = (fileName: string): { subPath: string; fileName: string } => {
  fileName = fileName.toLowerCase();
  if (!fileName.endsWith(".xml")) {
    fileName += ".xml";
  }

  let filePath: any = fileName.match(/(.+)\//);
  if (filePath) {
    filePath = "/" + filePath[1];
  } else {
    filePath = "";
  }

  return { subPath: filePath, fileName: fileName };
};

const readInclude = (file: string, rootPaths: string[], alreadyResolved: string[]) => {
  const { subPath, fileName } = getFilePath(file);
  const border = `<!-- include ${file} -->`;
  const [filePath, root] = findFromRoots(fileName, rootPaths);

  if (alreadyResolved.includes(filePath)) {
    throw new Error(`Cycle detected! File "${filePath}" was already included before.`);
  }

  alreadyResolved.push(filePath);

  const includeContent = readFileSync(filePath, { encoding: "utf-8" });
  const resolved = resolve(includeContent, [root + subPath], alreadyResolved, false);

  return `${border}\n${resolved}\n${border}`;
};

const findFromRoots = (file: string, rootPaths: string[]): [string, string] => {
  for (const root of rootPaths) {
    const fileName = `${root}/${file}`;
    if (existsSync(fileName)) {
      return [fileName, root];
    }
  }

  throw new Error(`Can not resolve file '${file}'!`);
};
