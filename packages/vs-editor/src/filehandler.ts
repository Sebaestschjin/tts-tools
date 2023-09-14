import { tmpdir } from "os";
import { dirname, join, normalize } from "path";
import { Uri, window, workspace } from "vscode";

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
