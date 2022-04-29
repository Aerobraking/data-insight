import pathNjs from "path";
import { ipcRenderer } from "electron";
import { FileWatcherSend, FileWatcherUpdate } from "@/filesystem/utils/FileWatcherInterfaces";
import IPCMessageType from "@/IpcMessageTypes";

interface WatcherListener {
    (type: string, path?: string): void;
}

interface MapCallbacks extends Map<string, WatcherListener[]> { }

/**
 * This class connects the app to the FileSystemWatcher instance in the other thread via ipc Messages.
 * The FileSystemWatcher watches for changes in the folders that are used in the app to refresh its list of files/folders.
 */
class FileSystemWatcherConnector {

    private hash: MapCallbacks = new Map();
    private hashRecursive: MapCallbacks = new Map();
    private static _instance = new FileSystemWatcherConnector();

    public reset() {
        this.hash.clear();
        this.hashRecursive.clear();

        let msg: FileWatcherSend = {
            type: "reset",
            path: "",
            recursive: false
        };
        ipcRenderer.send(IPCMessageType.RenderToFileWatcher, msg);
    }

    private constructor() {
        const _this = this;

        ipcRenderer.on(IPCMessageType.FileWatcherToRender,
            function (event: any, payload: FileWatcherUpdate) {
                _this.callUpdate(payload.path, payload.type, payload.map == "recursive" ? _this.hashRecursive : _this.hash)
            }
        );
    }

    private isSubDir(parent: string, dir: string) {
        const relative = pathNjs.relative(parent, dir);
        return relative && !relative.startsWith('..') && !pathNjs.isAbsolute(relative);
    }

    private callUpdate(path: string, type: string, map: MapCallbacks): void {

        const call = (p: string) => {
            try {
                let listCallbacks: { (type: string, path?: string): void; }[] | undefined = map.get(p); //get
                if (listCallbacks != undefined) {
                    for (let index = 0; index < listCallbacks.length; index++) {
                        const c = listCallbacks[index];
                        c(type, path);
                    }
                }
            } catch (err) {
                console.error("no access!");
            }
        };

        let defaultCall = true;

        map.forEach((value: WatcherListener[], key: string, map: MapCallbacks) => {
            if (this.isSubDir(key, path)) call(key), defaultCall = false;
        });

        if (defaultCall) call(path);

    }

    static get instance() {
        return this._instance;
    }

    registerPath(path: string, callback: (type: string, path?: string) => void, recursive: boolean = false) {

        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;

        const mapToUse = recursive ? this.hashRecursive : this.hash;

        let listCallbacks: { (type: string): void; }[] | undefined = mapToUse.get(path);

        if (listCallbacks == undefined) {
            listCallbacks = [];
            mapToUse.set(path, listCallbacks);

        }
        listCallbacks.push(callback);

        /**
         * A new folder was added, scan it.
         */
        let msg: FileWatcherSend = {
            type: "register",
            path: path,
            recursive: recursive
        };
        ipcRenderer.send(IPCMessageType.RenderToFileWatcher, msg);

    }

    unregisterPath(path: string, callback: (type: string, path?: string) => void, recursive: boolean = false) {

        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;

        const mapToUse = recursive ? this.hashRecursive : this.hash;

        let listCallbacks: { (type: string): void; }[] | undefined = mapToUse.get(path); //get

        if (listCallbacks != undefined) {
            const index = listCallbacks.indexOf(callback);
            if (index > -1) {
                listCallbacks.splice(index, 1);
            }

            if (listCallbacks.length == 0) {
                mapToUse.delete(path);
            }
        }


        /**
     * Ein neuer ordner wurde hinzugefügt, wir scannen ihn komplett.
     */
        let msg: FileWatcherSend = {
            type: "unregister",
            path: path,
            recursive: recursive
        };
        ipcRenderer.send(IPCMessageType.RenderToFileWatcher, msg);

    }

}

// the instance to use
export const FSWatcherConnectorInstance = FileSystemWatcherConnector.instance;