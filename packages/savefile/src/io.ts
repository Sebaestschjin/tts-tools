import { writeFileSync } from "fs";

export const writeFile = (path: string, content: string) => {
    writeFileSync(path, content, { encoding: "utf-8" });
};

export const writeJson = (path: string, content: any) => {
    const jsonContent = JSON.stringify(content, null, 2);
    writeFile(path, jsonContent);
};
