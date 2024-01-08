interface ObjectInfo {
  /** The name of the object */
  name: string;
  /** The GUID of the object */
  guid: string;
  /** Base file name created for this object (without extension). */
  fileName: string;
  hasUi: boolean;
}

export type LoadedObject = RegularLoadedObject | GlobalLoadedObject;

export interface RegularLoadedObject extends ObjectInfo {
  isGlobal: false;
  data: ObjectData;
}
interface GlobalLoadedObject extends ObjectInfo {
  isGlobal: true;
  data: GlobalObjectData;
}

export type SetLoadedObject = SetRegularLoadedObject | SetGlobalLoadedObject;

type SetRegularLoadedObject = Omit<RegularLoadedObject, "hasUi">;

type SetGlobalLoadedObject = Omit<GlobalLoadedObject, "guid" | "hasUi">;

interface GlobalObjectData {
  LuaScript: string; // eslint-disable-line @typescript-eslint/naming-convention
  XmlUI?: string; // eslint-disable-line @typescript-eslint/naming-convention
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
