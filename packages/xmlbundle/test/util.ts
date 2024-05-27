import { readFileSync } from "fs";

export const includeDir = `${__dirname}/include`;
export const includeDirTwo = `${__dirname}/includeTwo`;
const resolvedDir = `${__dirname}/resolved`;

export const readInclude = (name: string) => {
  return readFileSync(`${includeDir}/${name}.xml`, { encoding: "utf-8" });
};

export const readIncludeTwo = (name: string) => {
  return readFileSync(`${includeDirTwo}/${name}.xml`, { encoding: "utf-8" });
};

export const readResolved = (name: string) => {
  return readFileSync(`${resolvedDir}/${name}.xml`, { encoding: "utf-8" });
};

export const bordered = (name: string, content: string) => {
  const border = `<!-- include ${name} -->`;
  return `${border}\n${content}\n${border}`;
};

export const borderedFile = (border: string, file: string) => {
  const fileContent = readInclude(file);
  return bordered(border, fileContent);
};
