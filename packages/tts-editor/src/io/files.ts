import { dir } from "console";
import { tmpdir } from "os";
import { dirname, join, normalize, posix } from "path";
import { FileType, Uri, window, workspace } from "vscode";

export const tempFolder = join(tmpdir(), "TabletopSimulator", "Tabletop Simulator Editor");

export const getOutputPath = (bundled?: boolean): Uri => {
  const root = getWorkspaceRoot();
  const basePath = Uri.joinPath(root, "/.tts");

  return bundled ? Uri.joinPath(basePath, "/bundled") : basePath;
};

export const getWorkspaceRoot = (): Uri => {
  if (!workspace.workspaceFolders) {
    throw new Error("No workspace selected");
  }

  return workspace.workspaceFolders[0].uri;
};

export const getOutputFileUri = (fileName: string, bundled?: boolean) => {
  const directory = getOutputPath(bundled);
  return directory.with({
    path: posix.join(directory.path, fileName),
  });
};

export const writeOutputFile = async (fileName: string, content: string) => {
  return writeWorkspaceFile(getOutputPath(), fileName, content);
};

export async function createWorkspaceFolder() {
  try {
    await workspace.fs.createDirectory(Uri.file(tempFolder));
  } catch (reason: any) {
    window.showErrorMessage(`Failed to create workspace folder: ${reason}`);
  }
}

export const writeTempFile = (fileName: string, content: string) => {
  const fileUri = getTempFileUri(fileName);
  workspace.fs.createDirectory(Uri.file(dirname(fileUri.fsPath))).then(() => {
    workspace.fs.writeFile(fileUri, Buffer.from(content, "utf-8"));
  });
};

export const openTempFile = (fileName: string) => {
  const fileUri = getTempFileUri(fileName);

  return window.showTextDocument(fileUri, {
    preserveFocus: true,
    preview: false,
  });
};

const getTempFileUri = (fileName: string) => Uri.file(normalize(join(tempFolder, fileName)));

export const readFile = async (file: Uri) =>
  workspace.fs
    .readFile(file)
    .then(Buffer.from)
    .then((b) => b.toString("utf-8"));

export type FileInfo = [string, FileType];

export const readWorkspaceFile = async (directory: Uri, fileName: string): Promise<string | undefined> => {
  const fileUri = directory.with({
    path: posix.join(directory.path, fileName),
  });

  return readFile(fileUri).then(
    (content) => content,
    () => undefined
  );
};

export const writeWorkspaceFile = async (base: Uri, fileName: string, content: string) => {
  const fileUri = Uri.joinPath(base, `/${fileName}`);
  return workspace.fs
    .createDirectory(base)
    .then(() => {
      workspace.fs.writeFile(fileUri, Buffer.from(content, "utf-8"));
    })
    .then(() => fileUri);
};
