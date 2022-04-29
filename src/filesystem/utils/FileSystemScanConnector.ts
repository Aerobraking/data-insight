import IPCMessageType from "@/IpcMessageTypes";
import { ipcRenderer } from "electron";
import { AbstractSyncMessage, FileSystemListener, FolderFeatureResult, FolderSync, FolderSyncFinished, FolderSyncResult, SyncMessageType } from "./FileSystemMessages";

/**
 * This class connects the app with the thread that handles the filesystem scanning.
 */
export class FileSystemScanConnector {

    private hashDeepSync: Map<number, FileSystemListener> = new Map();
    private static _instance = new FileSystemScanConnector();

    static get instance() {
        return this._instance;
    }

    private constructor() {
        let _this = this;

        ipcRenderer.on(IPCMessageType.FileScanToRender,
            function (event: any, payload: AbstractSyncMessage) {

                let listener: FileSystemListener | undefined = _this.hashDeepSync.get(payload.id);

                switch (payload.type) {
                    case SyncMessageType.foldersync:
                        if (listener) listener.event(payload as FolderSyncResult);
                        break;
                    case SyncMessageType.folderfeatures:
                        if (listener) listener.event(payload as FolderFeatureResult);
                        break;
                    case SyncMessageType.folderdeepsyncfinished:
                        if (listener) listener.event(payload as FolderSyncFinished);
                        break;
                }

            }
        );

    }

    /**
     * Scan the complete structure of the given path
     * @param listener
     */
    syncFolder(listener: FileSystemListener): void {

        this.hashDeepSync.set(listener.getID(), listener);

        let msg: FolderSync = {
            type: SyncMessageType.folderdeepsync,
            collectionSize: 25,
            path: listener.getPath(),
            depth: 4,
            id: listener.getID()
        }

        ipcRenderer.send(IPCMessageType.RenderToFileScan, msg);

    }

    /**
     * Starts a scanning of the content of an collection node.
     * @param listener 
     * @param path Absolute path to the folder that you want to sync
     * @param depth 
     */
    syncOpenedCollection(listener: FileSystemListener, path: string, depth: number): void {

        this.hashDeepSync.set(listener.getID(), listener);

        let msg: FolderSync = {
            type: SyncMessageType.folderdeepsync,
            collectionSize: 5000,
            path: path,
            depth: depth,
            id: listener.getID()
        }

        ipcRenderer.send(IPCMessageType.RenderToFileScan, msg);
    }

}

export const Instance = FileSystemScanConnector.instance;