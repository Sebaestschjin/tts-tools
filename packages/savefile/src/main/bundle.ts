import { bundle as bundleXml, unbundle as unbundleXml } from "@tts-tools/xmlbundle";
import { bundleString, unbundleString } from "luabundle";

/**
 * Bundles the given Lua `script` by resolving `require()` call using the given `includePath`.
 *
 * @param script The script content.
 * @param includePath The path to look for additional includes.
 * @returns The bundled script.
 */
export const luaBundle = (script: string, includePath: string): string => {
  const bundled = bundleString(script, {
    paths: [`${includePath}/?.lua`, `${includePath}/?.ttslua`],
  });

  return bundled.startsWith("-- Bundled") ? bundled + "\n" : bundled;
};

/**
 * Unbundles the bundled Lua `script` by removing all bundles expect the root bundle.
 *
 * @param script The script content.
 * @returns The unbundled script.
 */
export const luaUnbundle = (script: string): string => {
  if (script.startsWith("-- Bundled by luabundle")) {
    const unbundled = unbundleString(script, { rootOnly: true });
    return unbundled.modules.__root.content;
  }

  return script;
};

/**
 * Bundles the given XML `xmlUi` by resolving `<Include src="" />` directives using the given `includePath`.
 *
 * @param xmlUi The XML UI content.
 * @param includePath The path to look for additional includes.
 * @returns The bundled XML UI.
 */
export const xmlBundle = (xmlUi: string, includePath: string): string => {
  return bundleXml(xmlUi, includePath);
};

/**
 * Unbundles the bundled XML `xmlUI` by removing all included files and replacing them with the `<Include src="" />` directive again.
 *
 * @param xmlUi The script content.
 * @returns The unbundled script.
 */
export const xmlUnbundle = (xmlUi: string): string => {
  return unbundleXml(xmlUi);
};
