/** Messages send from the extension to TTS as custom messages. */
export type EditorMessage = ObjectMessage;

/** Sends the requested object GUID to TTS */
export interface ObjectMessage {
  type: "object";
  guid: string;
}

/** Messages send from TTS to the extension as custom messages. */
export type RequestEditorMessage = RequestObjectMessage | WriteContentMessage;

/** Request to select an object from the currently loaded ones. */
export interface RequestObjectMessage {
  type: "object";
  title?: string;
  placeholder?: string;
  withGlobal?: boolean;
}

export interface WriteContentMessage {
  type: "write";
  name?: string;
  object?: string;
  content: string;
  format?: MessageFormat;
}

export type MessageFormat = "auto" | "none";
