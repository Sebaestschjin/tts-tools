export type ContentsFile = ContentEntry[];

export interface ContentEntry {
    path: string;
}

export type StatesFile = StateEntry[];

export interface StateEntry {
    id: string;
    path: string;
}
