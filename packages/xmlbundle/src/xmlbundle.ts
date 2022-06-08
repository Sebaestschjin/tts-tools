import { readFileSync } from "fs";

const INCLUDE_REGEX = /^(\s*)<Include src="([^"]+)"\s*\/>/im;
const BORDER_REGEX = /(<!-- include (.*?) -->)\n(.*?)\1/gs;

export const bundle = (xmlUi: string, includePath: string): string => {
  return resolve(xmlUi, includePath);
};

export const unbundle = (xmlUi: string): string => {
  const replacement = '<Include src="$2" />';

  return xmlUi.replaceAll(BORDER_REGEX, replacement);
};

const resolve = (xmlUi: string, path: string) => {
  let resolved = xmlUi;
  let match = resolved.match(INCLUDE_REGEX);

  while (match) {
    let resolvedInclude = readInclude(match[2], path);
    const indent = match[1] ?? "";
    resolvedInclude = resolvedInclude.replaceAll(/^/gm, indent);
    resolvedInclude = resolvedInclude.replaceAll(/^\s+$/gm, "");

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

const readInclude = (file: string, currentPath: string) => {
  const { subPath, fileName } = getFilePath(file);
  const border = `<!-- include ${file} -->`;

  const includeContent = readFileSync(`${currentPath}/${fileName}`, { encoding: "utf-8" });
  const resolved = resolve(includeContent, currentPath + subPath);

  return `${border}\n${resolved}\n${border}`;
};
