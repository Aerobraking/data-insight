import { ipcRenderer } from "electron";
import { FileSystemListener, FolderFeatureResult,  FolderSync, FolderSyncFinished, FolderSyncResult } from "./FileSystemMessages";

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
                
                if (payload.type == "folderfeatures") {
                    let msg: FolderFeatureResult = payload;

                    let listener: FileSystemListener | undefined = _this.hashDeepSync.get(msg.id);

                    if (listener) {
                        listener.event(msg);
                    }
                }
                if (payload.type == "folderdeepsyncfinished") {
                    let msg: FolderSyncFinished = payload;

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

        let msg: FolderSync = {
            type: "folderdeepsync",
            collectionSize: 45,
            path: listener.getPath(),
            depth: 4,
            id: listener.getID()
        }

        ipcRenderer.send('msg-main', msg);

    }

    /**
     * 
     * @param listener 
     * @param path Absolute path to the folder that you want to sync
     * @param depth 
     */
     syncOpenedCollection(listener: FileSystemListener, path: string, depth: number,): void {


        let msg: FolderSync = {
            type: "folderdeepsync",
            collectionSize: 5000,
            path: path,
            depth: depth,
            id: listener.getID()
        } 

        /**
         * Ein neuer ordner wurde hinzugefügt, wir scannen ihn komplett.
         */
        ipcRenderer.send('msg-main', msg);

    }

}

export const Instance = FileSystemWatcher.instance;

