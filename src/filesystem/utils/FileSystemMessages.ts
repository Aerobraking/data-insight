import { Features } from "../../core/model/workspace/overview/FeatureType";
/**
 * These interfaces are used for sending data back and forth between the app and the Thread that scans
 * the file system.
 */

export interface FileSystemListener {
    event(e: FolderFeatureResult | FolderSyncResult | FolderSyncFinished): void;
    // the path you want to scan
    getPath(): string;
    getID(): number;
}

export enum SyncMessageType {
    folderdeepsync = "folderdeepsync",
    folderfeatures = "folderfeatures",
    foldersync = "foldersync",
    folderdeepsyncfinished = "folderdeepsyncfinished",
}

export interface AbstractSyncMessage {
    type: SyncMessageType,
    id: number // the id of the AbstractNodeTree that listens to this syncing
}

export interface FolderSync extends AbstractSyncMessage {
    type: SyncMessageType.folderdeepsync,
    depth: number,
    collectionSize: number,
    path: string,
}

export interface FolderSyncResult extends AbstractSyncMessage {
    type: SyncMessageType.foldersync,
    path: string,
    childCount: number,
    collection: boolean,
}

export interface FolderFeatureResult extends AbstractSyncMessage {
    type: SyncMessageType.folderfeatures,
    path: string,
    features: Features,
}
export interface FolderSyncFinished extends AbstractSyncMessage {
    type: SyncMessageType.folderdeepsyncfinished,
    path: string,
}
