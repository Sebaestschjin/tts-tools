import { posix } from "path";
import { Uri, workspace } from "vscode";
import configuration from "../configuration";

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

/**
 * Reads a data file from the output directory of the extension.
 *
 * @param fileName The name of the file to write.
 * @param bundled Determines whether the file is for a regular file or for a bundled file.
 */
export const readOutputFile = async (fileName: string, bundled: boolean = false) => {
  return readWorkspaceFile(getOutputPath(bundled), fileName);
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
