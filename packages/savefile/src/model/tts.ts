/**
 * Data of a TTS save file.
 * Not complete, as it only contains information required by this tool.
 */
export interface SaveFile {
  LuaScript?: string;
  LuaScriptState?: string;
  XmlUI?: string;
  ObjectStates: TTSObject[];
  [other: string]: any;
}

/**
 * Data of a TTS object.
 * Not complete, as it only contains information required by this tool.
 */
export interface TTSObject {
  GUID: string;
  Nickname: string;
  Name: string;
  LuaScript?: string;
  LuaScriptState?: string;
  XmlUI?: string;
  ContainedObjects?: TTSObject[];
  States?: Record<string, TTSObject>;
  [other: string]: any;
}
