import { readFileSync } from "fs";

const INCLUDE_REGEX = /^([\t ]*)<Include src="([^"]+)"\s*\/>/im;
const BORDER_REGEX = /(<!-- include (.*?) -->)\n(.*?)\1/gs;

export const bundle = (xmlUi: string, includePath: string): string => {
  return resolve(xmlUi, includePath, [], true);
};

export const unbundle = (xmlUi: string): string => {
  const replacement = '<Include src="$2" />';

  return xmlUi.replaceAll(BORDER_REGEX, replacement);
};

const resolve = (xmlUi: string, path: string, alreadyResolved: string[], topLevel: boolean) => {
  let resolved = xmlUi;
  let match = resolved.match(INCLUDE_REGEX);

  while (match) {
    let resolvedInclude = readInclude(match[2], path, alreadyResolved);
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

const readInclude = (file: string, currentPath: string, alreadyResolved: string[]) => {
  const { subPath, fileName } = getFilePath(file);
  const border = `<!-- include ${file} -->`;
  const filePath = `${currentPath}/${fileName}`;

  if (alreadyResolved.includes(filePath)) {
    throw new Error(`Cycle detected! File "${filePath}" was already included before.`);
  }

  alreadyResolved.push(filePath);

  const includeContent = readFileSync(filePath, { encoding: "utf-8" });
  const resolved = resolve(includeContent, currentPath + subPath, alreadyResolved, false);

  return `${border}\n${resolved}\n${border}`;
};
