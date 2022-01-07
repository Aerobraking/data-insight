import { NodeFeatures } from "../../app/overview/AbstractNodeFeature";

export interface FileSystemListener {
    event(e: FolderFeatureResult | FolderSyncResult | FolderSyncFinished): void;
    getPath(): string;
    getID(): number;
}

export interface MessageType {
    type: "folderdeepsync" | "folderfeatures" | "foldersync" | "folderdeepsyncfinished",
    id: number // the id of the abstractnodeshell that listens to this syncing
}

export interface FolderSync extends MessageType {
    type: "folderdeepsync",
    depth: number,
    collectionSize: number,
    path: string,
}
 
export interface FolderSyncResult extends MessageType {
    type: "foldersync",
    path: string,
    childCount: number,
    collection: boolean,
}
 
export interface FolderFeatureResult extends MessageType {
    type: "folderfeatures",
    path: string,
    features: NodeFeatures,
}
export interface FolderSyncFinished extends MessageType {
    type: "folderdeepsyncfinished",
    path: string,
}
