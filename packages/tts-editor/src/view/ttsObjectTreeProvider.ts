import {
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
} from "vscode";
import { getOutputFileUri } from "../io/files";
import { LoadedObject } from "../model/objectData";
import { Plugin } from "../plugin";

export class TTSObjectTreeProvider implements TreeDataProvider<TTSItem> {
  private plugin: Plugin;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  private _onDidChangeTreeData: EventEmitter<TTSItem | undefined | null | void> = new EventEmitter<
    TTSItem | undefined | null | void
  >();

  readonly onDidChangeTreeData?: Event<void | TTSItem | TTSItem[] | null | undefined> | undefined =
    this._onDidChangeTreeData.event;

  getTreeItem(element: TTSItem): TreeItem | Thenable<TreeItem> {
    return element;
  }

  getChildren(element?: TTSItem | undefined): ProviderResult<TTSItem[]> {
    if (element) {
      if (element instanceof TTSObjectItem) {
        const elements = [new TTSScriptItem(element.object, "Script", "lua")];

        if (element.object.hasUi) {
          elements.push(new TTSScriptItem(element.object, "UI", "xml"));
        }

        return Promise.resolve(elements);
      }
      return Promise.resolve([]);
    } else {
      const elements: TTSObjectItem[] = [];

      for (const [_, object] of this.plugin.getLoadedObjects()) {
        elements.push(new TTSObjectItem(object));
      }
      elements.sort((a, b) => a.object.name.localeCompare(b.object.name));

      return Promise.resolve(elements);
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

type TTSItem = TTSObjectItem | TTSScriptItem;

class TTSObjectItem extends TreeItem {
  public readonly object: LoadedObject;

  constructor(object: LoadedObject) {
    super(object.name, TreeItemCollapsibleState.Collapsed);

    this.object = object;
    this.description = `${object.guid}`;
  }
}

export class TTSScriptItem extends TreeItem {
  public readonly object: LoadedObject;
  private extension: string;

  constructor(object: LoadedObject, name: string, extension: string) {
    super(name);
    this.object = object;
    this.extension = extension;
    this.contextValue = "script";

    this.command = {
      title: "Open script file",
      command: "vscode.open",
      arguments: [getOutputFileUri(this.fileName())],
    };
  }

  openBundledScript = () => {
    window.showTextDocument(getOutputFileUri(this.fileName(), true));
  };

  private fileName = () => `${this.object.fileName}.${this.extension}`;
}
