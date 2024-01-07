/** Messages send from the extension to TTS as custom messages. */
export type EditorMessage = ObjectMessage;

/** Sends the requested object GUID to TTS */
interface ObjectMessage {
  type: "object";
  guid: string;
}

/** Messages send from TTS to the extension as custom messages. */
export type RequestEditorMessage = RequestObjectMessage;

/** Request to select an object from the currently loaded ones. */
interface RequestObjectMessage {
  type: "object";
  title?: string;
  withGlobal?: boolean;
}
