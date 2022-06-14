/**
 * Type for the file describing the contained objects of a [[TTSObject]].
 */
export type ContentsFile = ContentEntry[];

/**
 * Describes on entry in the [[ContentsFile]] file.
 */
export interface ContentEntry {
  /** The path to the object's data. */
  path: string;
}

/**
 * Type for the file describing the states of a [[TTSObject]].
 */
export type StatesFile = Record<string, StateEntry>;

/**
 * Describes on entry in the [[StatesFile]] file.
 */
export interface StateEntry {
  /** The path to the object's data. */
  path: string;
}
