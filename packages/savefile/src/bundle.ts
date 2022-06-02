import { bundle as bundleXml, unbundle as unbundleXml } from "@tts-tools/xmlbundle";
import { bundleString, unbundleString } from "luabundle";

export const luaBundle = (script: string, includePath: string): string => {
    const bundled = bundleString(script, {
        paths: [`${includePath}/?.lua`, `${includePath}/?.ttslua`],
    });

    return bundled.startsWith("-- Bundled") ? bundled + "\n" : bundled;
};

export const luaUnbundle = (script: string): string => {
    if (script.startsWith("-- Bundled by luabundle")) {
        const unbundled = unbundleString(script, { rootOnly: true });
        return unbundled.modules.__root.content;
    }

    return script;
};

export const xmlBundle = (xmlUi: string, includePath: string): string => {
    return bundleXml(xmlUi, includePath);
};

export const xmlUnbundle = (xmlUi: string): string => {
    return unbundleXml(xmlUi);
};
