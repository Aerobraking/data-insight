export interface FileSystemListener {
    event(e: FolderStatsResult | FolderSyncResult | FolderSyncFinished): void;
    getPath(): string; 
    getID(): number;
}

export interface MessageType {
    type: "folderdeepsync" | "foldersync" | "folderstats" | "folderdeepsyncfinished",
    id: number // the id of the abstractnodeshell that listens to this syncing
}

export interface FolderSync extends MessageType {
    type: "folderdeepsync",
    depth: number,
    collectionSize: number,
    path: string,
}

export interface FolderStat extends Stats {

}

export interface FolderSyncResult extends MessageType {
    type: "foldersync",
    path: string,
    childCount: number,
    collection: boolean,
}

export interface FolderStatsResult extends MessageType {
    type: "folderstats",
    path: string,
    stats: FolderStat,
}
export interface FolderSyncFinished extends MessageType {
    type: "folderdeepsyncfinished",
    path: string,
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