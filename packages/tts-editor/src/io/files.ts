import path, { posix } from "path";
import { Extension, Uri, window, workspace } from "vscode";
import { LoadedObject } from "../model/objectData";

export type OutputType = "script" | "bundle" | "library" | "output";

export class FileHandler {
  private extension: Extension<unknown>;

  constructor(extension: Extension<unknown>) {
    this.extension = extension;
  }

  /**
   * Reads a file from the bundled files for the extension.
   */
  readExtensionFile = async (fileName: string) => {
    const extensionFile = this.getFileUri(this.extension.extensionUri, fileName);
    return readFile(extensionFile);
  };

  /**
   * Reads a file from the output directory.
   */
  readOutputFile = async (object: LoadedObject, extension: string, type: OutputType) => {
    const fileName = `${object.fileName}.${extension}`;
    const outputUri = this.getOutputUri(fileName, type);
    this.checkFile(outputUri);
    return readFile(outputUri);
  };

  /**
   * Writes a file to the output directory.
   */
  writeOutputFile = async (fileName: string, content: string, type: OutputType) => {
    const outputUri = getOutputPath(type);
    this.checkFile(outputUri, fileName);
    return writeFile(outputUri, fileName, content);
  };

  fileExists = async (file: Uri) => {
    return workspace.fs.stat(file).then(
      () => true,
      () => false
    );
  };

  private checkFile(fileUri: Uri, fileName?: string) {
    const fullUri = fileName ? Uri.joinPath(fileUri, `/${fileName}`) : fileUri;
    if (!this.isInWorkspace(fullUri)) {
      const errorMessage = `Can not handle file outside of workspace: ${fullUri}`;
      window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }
  }

  private isInWorkspace(fileUri: Uri): boolean {
    const root = getWorkspaceRoot();
    const asPath = path.normalize(fileUri.fsPath);
    const resolvedFilePath = path.resolve(root.fsPath, asPath);

    return resolvedFilePath.startsWith(root.fsPath);
  }

  /**
   * Returns the Uri for the given `fileName` of the given `outputType`
   */
  private getOutputUri(fileName: string, outputType: OutputType) {
    const outputPath = getOutputPath(outputType);
    return this.getFileUri(outputPath, fileName);
  }

  /**
   * Returns a new Uri for a file with the given `fileName` and the given Uri for the `directory`.
   */
  private getFileUri(directory: Uri, fileName: string): Uri {
    return directory.with({
      path: posix.join(directory.path, fileName),
    });
  }
}

export const iconPath = (name: string) => {
  return {
    light: Uri.joinPath(Uri.file(__filename), "..", "..", "..", "media", "icon", `${name}.png`),
    dark: Uri.joinPath(Uri.file(__filename), "..", "..", "..", "media", "icon", `${name}-dark.png`),
  };
};

/**
 * Returns the path where all data files will be written to.
 *
 * @param bundled Determines whether the output is for a regular file or for a bundled file.
 */
export const getOutputPath = (bundled: OutputType = "script"): Uri => {
  const root = getWorkspaceRoot();
  const basePath = Uri.joinPath(root, "/.tts");

  switch (bundled) {
    case "script":
      return Uri.joinPath(basePath, "/objects");
    case "bundle":
      return Uri.joinPath(basePath, "/bundled");
    case "library":
      return Uri.joinPath(basePath, "/library");
    case "output":
      return Uri.joinPath(basePath, "/output");
  }
};

/**
 * Returns the path for a data file to write.
 *
 * @param fileName The name of the file to write.
 * @param bundled Determines whether the file is for a regular file or for a bundled file.
 */
export const getOutputFileUri = (fileName: string, bundled: OutputType = "script") => {
  const directory = getOutputPath(bundled);
  return directory.with({
    path: posix.join(directory.path, fileName),
  });
};

export const hasOutputFile = async (fileName: string, bundled: OutputType = "script") => {
  return await workspace.fs.stat(getOutputFileUri(fileName, bundled)).then(
    () => true,
    () => false
  );
};

/**
 * Reads a data file from the output directory of the extension.
 *
 * @param fileName The name of the file to write.
 * @param bundled Determines whether the file is for a regular file or for a bundled file.
 */
export const readOutputFile = async (fileName: string, bundled: OutputType = "script") => {
  return readWorkspaceFile(getOutputPath(bundled), fileName);
};

/**
 * Writes a data file to the output directory of the extension.
 *
 * @param fileName The name of the file to write.
 * @param content The content of the file.
 * @param bundled Determines whether the file is for a regular file or for a bundled file.
 */
export const writeOutputFile = async (fileName: string, content: string, bundled: OutputType = "script") => {
  return writeFile(getOutputPath(bundled), fileName, content);
};

const getWorkspaceRoot = (): Uri => {
  if (!workspace.workspaceFolders) {
    throw new Error("No workspace selected");
  }

  return workspace.workspaceFolders[0].uri;
};

const readWorkspaceFile = async (directory: Uri, fileName: string): Promise<string | undefined> => {
  const fileUri = directory.with({
    path: posix.join(directory.path, fileName),
  });

  return readFile(fileUri).then(
    (content) => content,
    () => undefined
  );
};

const readFile = async (file: Uri) =>
  workspace.fs
    .readFile(file)
    .then(Buffer.from)
    .then((b) => b.toString("utf-8"));

const writeFile = async (base: Uri, fileName: string, content: string) => {
  const fileUri = Uri.joinPath(base, `/${fileName}`);
  return workspace.fs
    .createDirectory(base)
    .then(() => workspace.fs.writeFile(fileUri, Buffer.from(content, "utf-8")))
    .then(() => fileUri);
};
