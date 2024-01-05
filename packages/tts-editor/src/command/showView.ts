import { TreeView } from "vscode";
import { TTSItem } from "../view/ttsObjectTreeProvider";

export default (view: TreeView<TTSItem>) => () => {
  view.reveal(null as any);
};
