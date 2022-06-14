import { SaveFile } from "../../src";

interface CustomMatchers<R = unknown> {
  toMatchSave(saveFile: SaveFile): R;
  toMatchDirectory(path: string): R;
}

export {};
declare global {
  namespace jest {
    interface Matchers<R> extends CustomMatchers<R> {}
  }
}
