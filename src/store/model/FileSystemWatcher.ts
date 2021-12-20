import { ipcRenderer } from "electron";
import { FileSystemListener, FolderStatsResult, FolderSync, FolderSyncResult } from "./FileOverviewInterfaces";

export class FileSystemWatcher {

    private hashDeepSync: Map<number, FileSystemListener> = new Map();
    private hash: Map<String, FileSystemListener[]> = new Map();
    private static _instance = new FileSystemWatcher();

    static get instance() {
        return this._instance;
    }

    private constructor() {
        let _this = this;

        ipcRenderer.on("msg-worker",
            function (event: any, payload: any) {

                if (payload.type == "foldersync") {
                    let msg: FolderSyncResult = payload;

                    let listener: FileSystemListener | undefined = _this.hashDeepSync.get(msg.id);

                    if (listener) {
                        listener.event(msg);
                    }
                }
                if (payload.type == "folderstats") {
                    let msg: FolderStatsResult = payload;

                    let listener: FileSystemListener | undefined = _this.hashDeepSync.get(msg.id);

                    if (listener) {
                        listener.event(msg);
                    }
                }

            }
        );

    }

    syncFolder(listener: FileSystemListener): void {

        this.hashDeepSync.set(listener.getID(), listener);

        let msg: FolderSync = { type: "folderdeepsync", collectionSize: 50, path: listener.getPath(), depth: listener.getDepth(), id: listener.getID() }

        /**
         * Ein neuer ordner wurde hinzugefügt, wir scannen ihn komplett.
         */
        ipcRenderer.send('msg-main', msg);

    }
    
    syncFolderMan(listener: FileSystemListener, path: string, depth: number,): void {


        let msg: FolderSync = { type: "folderdeepsync", collectionSize: 5000, path: path, depth: depth, id: listener.getID() }
        console.log(msg);

        /**
         * Ein neuer ordner wurde hinzugefügt, wir scannen ihn komplett.
         */
        ipcRenderer.send('msg-main', msg);

    }

}

export const Instance = FileSystemWatcher.instance;

