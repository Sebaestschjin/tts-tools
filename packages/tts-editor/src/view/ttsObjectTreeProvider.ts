import {
  Event,
  EventEmitter,
  ProviderResult,
  ThemeIcon,
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
        return Promise.resolve(this.getObjectContent(element));
      }
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.getLoadedObjects());
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  private getLoadedObjects() {
    const elements: TTSObjectItem[] = [];

    for (const [_, object] of this.plugin.getLoadedObjects()) {
      elements.push(new TTSObjectItem(object));
    }
    elements.sort((a, b) => {
      const nameA = a.object.name;
      const nameB = b.object.name;
      if (nameA === "Global") {
        return -1;
      }
      if (nameB === "Global") {
        return 1;
      }

      const nameCompare = a.object.name.localeCompare(b.object.name);
      if (nameCompare === 0) {
        return a.object.guid.localeCompare(b.object.guid);
      }

      return nameCompare;
    });

    return elements;
  }

  private getObjectContent(element: TTSObjectItem) {
    const elements = [new TTSScriptItem(element.object, "Script", "lua")];

    if (element.object.hasUi) {
      elements.push(new TTSScriptItem(element.object, "UI", "xml"));
    }

    return elements;
  }
}

type TTSItem = TTSObjectItem | TTSScriptItem;

class TTSObjectItem extends TreeItem {
  public readonly object: LoadedObject;

  constructor(object: LoadedObject) {
    super(object.name, TreeItemCollapsibleState.Collapsed);

    this.object = object;
    this.iconPath = ThemeIcon.Folder;
    if (object.name === "Global") {
    } else {
      this.description = object.guid;
    }
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
    this.iconPath = ThemeIcon.File;
    this.resourceUri = getOutputFileUri(this.fileName());

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