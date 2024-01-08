import path, { posix } from "path";
import { Extension, Uri, window, workspace } from "vscode";
import configuration from "../configuration";
import { LoadedObject } from "../model/objectData";

export class FileHandler {
  private extension: Extension<any>;

  constructor(extension: Extension<any>) {
    this.extension = extension;
  }

  readExtensionFile = async (fileName: string) => {
    return this.readFile(this.extension.extensionUri, fileName);
  };

  readWorkspaceFile = async (fileName: string) => {
    if (!this.isInWorkspace(fileName)) {
      const errorMessage = `Can not read file outside of workspace while reading file ${fileName}`;
      window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }

    return this.readFile(getWorkspaceRoot(), fileName);
  };

  writeWorkspaceFile = async (fileName: string, content: string) => {
    if (!this.isInWorkspace(fileName)) {
      const errorMessage = `Can not write file outside of workspace while writing file ${fileName}`;
      window.showErrorMessage(errorMessage);
      throw new Error(errorMessage);
    }

    return this.writeFile(getWorkspaceRoot(), fileName, content);
  };

  readOutputFile = async (object: LoadedObject, extension: string) => {
    return this.readWorkspaceFile(`.tts/${object.fileName}.${extension}`);
  };

  writeOutputFile = async (fileName: string, content: string) => {
    return this.writeWorkspaceFile(`.tts/${fileName}`, content);
  };

  private isInWorkspace(fileName: string): boolean {
    const root = getWorkspaceRoot();
    const filePath = Uri.joinPath(root, fileName);
    const asPath = path.normalize(filePath.fsPath);
    const resolvedFilePath = path.resolve(root.fsPath, asPath);

    return resolvedFilePath.startsWith(root.fsPath);
  }

  private async readFile(base: Uri, fileName: string) {
    const fileUri = Uri.joinPath(base, `/${fileName}`);
    return workspace.fs
      .readFile(fileUri)
      .then(Buffer.from)
      .then((b) => b.toString("utf-8"));
  }

  private async writeFile(base: Uri, fileName: string, content: string) {
    const fileUri = Uri.joinPath(base, `/${fileName}`);
    return workspace.fs
      .createDirectory(base)
      .then(() => {
        workspace.fs.writeFile(fileUri, Buffer.from(content, "utf-8"));
      })
      .then(() => fileUri);
  }
}

export const iconPath = (name: string) => {
  return {
    light: path.join(__filename, "..", "..", "..", "media", "icon", `${name}.png`),
    dark: path.join(__filename, "..", "..", "..", "media", "icon", `${name}-dark.png`),
  };
};

/**
 * Returns the path where all data files will be written to.
 *
 * @param bundled Determines whether the output is for a regular file or for a bundled file.
 */
export const getOutputPath = (bundled: boolean = false): Uri => {
  const root = getWorkspaceRoot();
  const basePath = Uri.joinPath(root, "/.tts");

  return bundled ? Uri.joinPath(basePath, "/bundled") : basePath;
};

/**
 * Returns the path for a data file to write.
 *
 * @param fileName The name of the file to write.
 * @param bundled Determines whether the file is for a regular file or for a bundled file.
 */
export const getOutputFileUri = (fileName: string, bundled: boolean = false) => {
  const directory = getOutputPath(bundled);
  return directory.with({
    path: posix.join(directory.path, fileName),
  });
};

/**
 * Returns the path to the TSTL project to use.
 */
export const getTstlPath = () => {
  const root = getWorkspaceRoot();
  const path = configuration.tstlPath();
  return Uri.joinPath(root, path).fsPath;
};

export const hasOutputFile = async (fileName: string, bundled: boolean = false) => {
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
export const readOutputFile = async (fileName: string, bundled: boolean = false) => {
  return readWorkspaceFile(getOutputPath(bundled), fileName);
};

/**
 * Writes a data file to the output directory of the extension.
 *
 * @param fileName The name of the file to write.
 * @param content The content of the file.
 * @param bundled Determines whether the file is for a regular file or for a bundled file.
 */
export const writeOutputFile = async (fileName: string, content: string, bundled: boolean = false) => {
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
    .then(() => {
      workspace.fs.writeFile(fileUri, Buffer.from(content, "utf-8"));
    })
    .then(() => fileUri);
};
