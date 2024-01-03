import { tmpdir } from "os";
import { dirname, join, normalize, posix } from "path";
import { FileType, Uri, window, workspace } from "vscode";

export const tempFolder = join(tmpdir(), "TabletopSimulator", "Tabletop Simulator Editor");

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
