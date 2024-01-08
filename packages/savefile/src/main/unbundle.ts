import { unbundle as unbundleXml } from "@tts-tools/xmlbundle";
import { cloneDeepWith } from "lodash";
import { unbundleString } from "luabundle";

import { SaveFile, TTSObject } from "./model/tts";

/**
 * Takes a TTS save file and unbundles it.
 *
 * @param saveFile The save to unbundle
 * @returns A copy of the given save file where all Lua and XML scripts are unbundled.
 */
export const unbundleSave = (saveFile: SaveFile): SaveFile => {
  return cloneDeepWith(saveFile, unbundler);
};

export const unbundleObject = (object: TTSObject): TTSObject => {
  return cloneDeepWith(object, unbundler);
};

const unbundler = (value: any, key: string | number | undefined, obj: any) => {
  if (key === "LuaScript") {
    return unbundleLuaScript(obj);
  } else if (key == "XmlUI" && value) {
    return xmlUnbundle(value);
  }

  return undefined;
};

const unbundleLuaScript = (object: TTSObject) => {
  if (object.LuaScript) {
    try {
      let script = object.LuaScript;
      if (script.includes("-- Bundled by luabundle")) {
        // quickfixex - luabundle seems to have a problem when the line ending ist not \n,
        // which can easily happens when people copy/paste a bundled sript to TTS
        // also it doesn't whitespace at the beginning which can also happens during copy/paste
        script = script.replace(/^\s*/, "");
        script = script.replace(/(-- Bundled by luabundle {[^}]+})\s*\n/, "$1\n");

        const unbundled = unbundleString(script, { rootOnly: true });
        return unbundled.modules.__root.content;
      }

      return script;
    } catch (e) {
      console.error(`Error during extracting script for object ${object.Nickname}-${object.GUID}`, e);
    }
  }

  return "";
};

/**
 * Unbundles the bundled XML `xmlUI` by removing all included files and replacing them with the `<Include src="" />` directive again.
 *
 * @param xmlUi The script content.
 * @returns The unbundled script.
 */
const xmlUnbundle = (xmlUi: string): string => {
  return unbundleXml(xmlUi);
};
