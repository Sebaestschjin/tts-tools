import { existsSync, readFileSync } from "fs";
import { isAbsolute as pathIsAbsolute, join as pathJoin } from "path";

const INCLUDE_REGEX = /^([\t ]*)<Include src=(["'])(.+)\2\s*\/>/im;
const BORDER_REGEX = /(<!-- include (.*?) -->)(.*?)\1/gs;
const wrapBorder = (label: string, content: string) => `<!-- include ${label} -->\n${content}\n<!-- include ${label} -->`;

export const unbundle = (xmlUi: string): string => xmlUi.replaceAll(BORDER_REGEX, '<Include src="$2" />');
export const bundle = (xmlUi: string, includePaths: string[]): string => new Solver(includePaths).bundle(xmlUi);

class Solver {
  // Define include paths as attr so we can access them everywhere without passing them around
  constructor(private readonly includePaths: string[]) {}

  // Use a record to keep track of file states and avoid pass-by-reference issues with arrays / sets
  public bundle(input: string, resolvingFiles: Set<string> = new Set()): string {
    let match = input.match(INCLUDE_REGEX);
    while (match) {
      // Array destructuring to get the match groups
      const [matchContent, indent, _, file] = match;
      const resolvedPath = this.resolvePath(file);
      if (resolvedPath === undefined)
        throw new Error(`File not found: ${file}`);
      if (resolvingFiles.has(resolvedPath))
        throw new Error(`Cycle detected! File was already included before: ${resolvedPath}`);

      // Read the file content and add it to the records
      const includeContent = readFileSync(resolvedPath, { encoding: "utf-8" });
      resolvingFiles.add(resolvedPath);
      // Recursively call the bundle method to resolve nested includes, preserving indentation
      const bundledInclude = this.bundle(includeContent, resolvingFiles)
        .replace(/^(?=.)/gm, indent);
      resolvingFiles.delete(resolvedPath);
      // Replace the include tag with the bundled content
      const start = match.index!;
      const end = start + matchContent.length;
      input = input.substring(0, start) + wrapBorder(file, bundledInclude) + input.substring(end);
      match = input.match(INCLUDE_REGEX);
    }

    return input;
  }

  private resolvePath(file: string): string | undefined {
    file = file.toLowerCase();
    file = file.endsWith(".xml") ? file : file + ".xml";
    // Account for absolute paths
    if (pathIsAbsolute(file) && existsSync(file)) return file;
    else {
      // If not, check if the file exists in any of the include paths, the first one found will be used
      for (const currentPath of this.includePaths) {
        const candidate = pathJoin(currentPath, file)
        if(existsSync(candidate)) return candidate;
      }
    }
  }
}
