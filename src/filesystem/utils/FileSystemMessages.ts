import { Features } from "../../core/model/workspace/overview/FeatureType";

export interface FileSystemListener {
    event(e: FolderFeatureResult | FolderSyncResult | FolderSyncFinished): void;
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
