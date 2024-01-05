interface ObjectInfo {
  /** The GUID of the object */
  guid: string;
  /** The name of the object */
  name: string;
  /** Base file name created for this object (without extension). */
  fileName: string;
}

export interface LoadedObject extends ObjectInfo {
  hasUi: boolean;
}

export interface ObjectFile extends ObjectInfo {
  /** The attached Lua script */
  script: ScriptData;
  ui?: ScriptData;
}

export interface ScriptData {
  bundled: string;
  content: string;
}