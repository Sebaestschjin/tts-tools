export interface SaveFile {
    LuaScript?: string;
    LuaScriptState?: string;
    XmlUI?: string;
    ObjectStates: TTSObject[];
}

export interface TTSObject {
    GUID: string;
    Nickname: string;
    Name: string;
    LuaScript?: string;
    LuaScriptState?: string;
    XmlUI?: string;
    ContainedObjects?: TTSObject[];
    States?: Record<string, TTSObject>;
}
