import { QuickPickItem, window } from "vscode";
import { Plugin } from "../plugin";
import { LoadedObject } from "../model/objectData";

interface ObjectPickItem extends QuickPickItem {
  object: LoadedObject;
}

interface Options {
  includeGlobal?: boolean;
  title?: string;
}

export const performForSelectedObject = async (
  plugin: Plugin,
  handler: (object: LoadedObject) => unknown,
  options: Options = {}
) => {
  const selection = await selectObject(plugin, options);
  if (selection) {
    handler(selection);
  }
};

export const selectObject = async (plugin: Plugin, options: Options = {}) => {
  const objects: ObjectPickItem[] = Object.values(plugin.getLoadedObjects())
    .filter((o) => {
      return options.includeGlobal ? true : !o.isGlobal;
    })
    .map((o) => ({
      label: o.name,
      description: o.guid,
      object: o,
    }));

  const selection = await window.showQuickPick(objects, {
    title: options.title,
    matchOnDescription: true,
  });
  return selection ? selection.object : undefined;
};
