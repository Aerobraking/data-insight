import { FSWatcher } from "chokidar";
import chokidar from "chokidar";
import fs from "fs";
import pathNjs from "path";
import 'reflect-metadata';
import { ipcRenderer } from "electron";
import { FileWatcherUpdate, FileWatcherSend } from "./filesystem/utils/FileWatcherInterfaces";


interface MapCallbacks extends Map<string, number> {

}
 

class Watcher2 {

    private hash: MapCallbacks = new Map();
    private hashRecursive: MapCallbacks = new Map();
    private static _instance = new Watcher2();

    private watcher: FSWatcher;
    private watcherRecursive: FSWatcher;
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


        console.log("callUpdate", path, type, map);

        const call = (p: string) => {

            let result: FileWatcherUpdate = {
                id: "filewatcherupdate",
                map: map,
                type: type,
                path: path
            }

            ipcRenderer.send('msg-file-to-main', result);

        };

        let defaultCall = true;

        (map == "recursive" ? this.hashRecursive : this.hash).forEach((value: number, key: string, map: MapCallbacks) => {
            if (this.isSubDir(key, path)) call(key), defaultCall = false;
        });

        if (defaultCall) call(path);

    }

    static get instance() {
        return this._instance;
    }

    registerPath(path: string, recursive: boolean = false) {

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

    unregisterPath(path: string, recursive: boolean = false) {

        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;

        const mapToUse = recursive ? this.hashRecursive : this.hash;
        const watcherToUse = recursive ? this.watcherRecursive : this.watcher;

        let listCallbacks: number | undefined = mapToUse.get(path); //get

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

const FileSystemWatcher = Watcher2.instance;



ipcRenderer.on("msg-main-to-file", (event, payload: FileWatcherSend) => {
    switch (payload.type) {
        case "register":
            FileSystemWatcher.registerPath(payload.path, payload.recursive)
            break;
        case "unregister":
            FileSystemWatcher.unregisterPath(payload.path, payload.recursive)
            break;
    }
});


