/**
 * Data of a TTS save file.
 * Not complete, as it only contains information required by this tool.
 */
export interface SaveFile {
  SaveName: string;
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
  Name: string;
  Nickname: string;
  Description: string;
  GMNotes: string;
  Memo?: string;
  Tags?: string[];
  LuaScript?: string;
  LuaScriptState?: string;
  XmlUI?: string;
  ChildObjects?: TTSObject[];
  ContainedObjects?: TTSObject[];
  States?: Record<string, TTSObject>;
  [other: string]: any;
}
