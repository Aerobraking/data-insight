/**
 * This is the main entry point for a worker Thread created with a hidden window.
 * It handles the Watching of specfic Folders in the File System. Folders can be registered 
 * and unregistered via IPC. It then sends updates via IPC for these folders with the default chokidar types:
 * add, change, unlink, addDir, unlinkDir 
 */
import chokidar from "chokidar";
import fs from "fs";
import pathNjs from "path";
import 'reflect-metadata';
import { ipcRenderer } from "electron";
import { FileWatcherUpdate, FileWatcherSend } from "./filesystem/utils/FileWatcherInterfaces";
import IPCMessageType from "./IpcMessageTypes";

interface MapCallbacks extends Map<string, number> { };

/**
 * Uses a chokidar for watching folders in the File System. The update events will be send to the main
 * thread via IPC. 
 */
class FileSystemWatcher {

    /**
     * We only have one instance of this class that does the work.
     */
    static instance = new FileSystemWatcher();

    private hash: MapCallbacks = new Map();
    private hashRecursive: MapCallbacks = new Map();

    private watcher: chokidar.FSWatcher;
    private watcherRecursive: chokidar.FSWatcher;

    // while the FSWatcher are resetted, this flag is set to false, otherwise true.
    private isReady: boolean = true;

    private constructor() {

        this.watcherRecursive = chokidar.watch([], {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true,
            /**
             * both settings are important for the performance.
             * "alwaysStat: false"  disables the creation of the stats object for each file in a folder, which speedup things a lot
             * "depth:0"            makes sure only the current directory is watched and no subdirectories.
             */
            alwaysStat: false,
            followSymlinks: false,
            depth: 15
        });

        this.watcher = chokidar.watch([], {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true,
            /**
             * both settings are important for the performance.
             * "alwaysStat: false"  disables the creation of the stats object for each file in a folder, which speedup things a lot
             * "depth:0"            makes sure only the current directory is watched and no subdirectories.
             */
            alwaysStat: false,
            depth: 0
        });

        this.watcher
            .on("ready", (path: any) => {
            }).on("add", (path: any) => {
                // also call an update for the directory of the file, in case a folder view has this directory open.
                this.callUpdatePrep(path, "add", "default");
            })
            .on("change", (path: any) => {
                this.callUpdatePrep(path, "change", "default");
            })
            .on("unlink", (path: any) => {
                this.callUpdatePrep(path, "unlink", "default");
            })
            .on("addDir", (path: any) => {
                this.callUpdatePrep(path, "adddir", "default");
            })
            .on("unlinkDir", (path: any) => {
                this.callUpdatePrep(path, "unlinkdir", "default");
            });

        this.watcherRecursive
            .on("ready", (path: any) => {
            }).on("add", (path: any) => {
                // also call an update for the directory of the file, in case a folder view has this directory open.
                this.callUpdatePrep(path, "add", "recursive");
            })
            .on("change", (path: any) => {
                this.callUpdatePrep(path, "change", "recursive");
            })
            .on("unlink", (path: any) => {
                this.callUpdatePrep(path, "unlink", "recursive");
            })
            .on("addDir", (path: any) => {
                this.callUpdatePrep(path, "adddir", "recursive");
            })
            .on("unlinkDir", (path: any) => {
                this.callUpdatePrep(path, "unlinkdir", "recursive");
            });
    }

    public async reset() {
        this.isReady = false;
        await this.watcher.close();
        await this.watcherRecursive.close();
        this.isReady = true;
    }

    private callUpdatePrep(path: string, type: string, map: "recursive" | "default") {
        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;
        this.callUpdate(path, type, map); // update for file / dir
        if (path.includes("/")) this.callUpdate(path.substring(0, path.lastIndexOf("/")), "change", map); // update for parent dir
    }

    private isSubDir(parent: string, dir: string) {
        const relative = pathNjs.relative(parent, dir);
        return relative && !relative.startsWith('..') && !pathNjs.isAbsolute(relative);
    }

    private callUpdate(path: string, type: string, map: "recursive" | "default"): void {

        const call = (p: string) => {

            let result: FileWatcherUpdate = {
                id: "filewatcherupdate",
                map: map,
                type: type,
                path: path
            }

            ipcRenderer.send(IPCMessageType.FileWatcherToRender, result);
        };

        let defaultCall = true;

        (map == "recursive" ? this.hashRecursive : this.hash).forEach((value: number, key: string, map: MapCallbacks) => {
            if (this.isSubDir(key, path)) call(key), defaultCall = false;
        });

        if (defaultCall) call(path);

    }

    /**
     * Registers a path in the chokidar instance, if not already watched. For each
     * registerPath() call a counter will be increased for the given path. Calling unregisterPath() decreases
     * the counter, when reaching zero the path will be removed from chokidar. So don't forget to call unregisterPath()
     * when your object doesn't need the updates any more to save performance. :)
     * @param path the path you want to watch via chokidar. 
     * @param recursive boolean: should the path watched recursivly or not.
     */
    registerPath(path: string, recursive: boolean = false): void {

        if (!this.isReady) return;

        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;

        const mapToUse = recursive ? this.hashRecursive : this.hash;
        const watcherToUse = recursive ? this.watcherRecursive : this.watcher;

        let listCallbacks: number | undefined = mapToUse.get(path);

        if (listCallbacks == undefined) {
            listCallbacks = 0;
            watcherToUse.add(path);
            mapToUse.set(path, listCallbacks);
            //   hinterlegen ob eine datei existiert oder nicht um das zu melden. per watcher testen ob die datei wieder hergestellt wird was ja eh schon gemacht wird oder?.
            try {
                fs.accessSync(path, fs.constants.R_OK);
            } catch (err) {
                // inform about non existing file
                this.callUpdatePrep(path, "unlink", recursive ? "recursive" : "default");
            }
        }

        listCallbacks++;
        mapToUse.set(path, listCallbacks);
    }

    /**
     * 
     * @param path string: The path that you want to unregister. When the usage counter of the path reaches zero,
     * the path will not be watched any longer by the chokidar instance.
     * @param recursive boolean: is the path watched recursivly or not.
     */
    unregisterPath(path: string, recursive: boolean = false) {

        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;

        const mapToUse = recursive ? this.hashRecursive : this.hash;
        const watcherToUse = recursive ? this.watcherRecursive : this.watcher;

        let listCallbacks: number | undefined = mapToUse.get(path);

        if (listCallbacks != undefined) {
            listCallbacks--;
            mapToUse.set(path, listCallbacks);
            if (listCallbacks <= 0) {
                watcherToUse.unwatch(path);
                mapToUse.delete(path);
            }
        }

        console.log("unregister", path, recursive);
    }

}

export const Instance = FileSystemWatcher.instance;

/**
 * Recieve the events from the main thread and transmit them to the FileSystemWatcher instance.
 */
ipcRenderer.on(IPCMessageType.RenderToFileWatcher, (event, payload: FileWatcherSend) => {
    switch (payload.type) {
        case "reset":
            FileSystemWatcher.instance.reset();
            break;
        case "register":
            FileSystemWatcher.instance.registerPath(payload.path, payload.recursive)
            break;
        case "unregister":
            FileSystemWatcher.instance.unregisterPath(payload.path, payload.recursive)
            break;
    }
});


