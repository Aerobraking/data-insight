

export interface FileSystemListener {
    event(e: FolderStatsResult | FolderSyncResult): void;
    getPath(): string;
    getDepth(): number;
    getID(): number;
}

export interface MessageType {

}

export interface FolderSync extends MessageType {
    type: "folderdeepsync",
    depth: number,
    path: string,
    id: number
}

export interface FolderStat extends Stats {

}

export interface FolderSyncResult extends MessageType {
    type: "foldersync",
    path: string,
    id: number // the id of the overview entry that listens to this syncing
    childCount:number,
    collection:boolean,
}

export interface FolderStatsResult extends MessageType {
    type: "folderstats",
    path: string,
    stats: FolderStat,
    id: number // the id of the overview entry that listens to this syncing
}
 
export enum StatsType {
    MEDIAN,
    SUM
}

export type Stats = {
    path: string,
    stats: {
        [any: string]: { value: number, type: StatsType },
    },
}