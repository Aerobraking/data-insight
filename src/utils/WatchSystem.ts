import { FSWatcher } from "chokidar";

import chokidar from "chokidar";
import fs from "fs";
export class Watcher {

    private hash: Map<String, { (type: string): void; }[]> = new Map();
    private static _instance = new Watcher();
    private watcher: FSWatcher;
    private constructor() {

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
                this.callUpdatePrep(path, "add", true, true);
            })
            .on("change", (path: any) => {
                this.callUpdatePrep(path, "change", true, true);
            })
            .on("unlink", (path: any) => {
                this.callUpdatePrep(path, "unlink", true, true);
            })
            .on("addDir", (path: any) => {
                this.callUpdatePrep(path, "adddir", true, true);
            })
            .on("unlinkDir", (path: any) => {
                this.callUpdatePrep(path, "unlinkdir", true, true);
            });
    }

    private callUpdatePrep(path: string, type: string, dir: boolean = true, file: boolean = false) {
        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;
        file ? this.callUpdate(path, type) : 0;
        dir ? this.callUpdate(path.substring(0, path.lastIndexOf("/")), type) : 0;
    }

    private callUpdate(path: string, type: string): void {

        try {
            let listCallbacks: { (type: string): void; }[] | undefined = this.hash.get(path); //get
            if (listCallbacks != undefined) {
                for (let index = 0; index < listCallbacks.length; index++) {
                    const c = listCallbacks[index];
                    c(type);
                }
            }
        } catch (err) {
            console.error("no access!");
        }
    }

    static get instance() {
        return this._instance;
    }

    registerPath(path: string, callback: (type: string) => void) {

        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;

        let listCallbacks: { (type: string): void; }[] | undefined = this.hash.get(path);

        if (listCallbacks == undefined) {
            listCallbacks = [];
            this.watcher.add(path);
            this.hash.set(path, listCallbacks);
        }
        listCallbacks.push(callback);
        try {
            fs.accessSync(path, fs.constants.R_OK);
        } catch (err) {
            // inform about non existing file
            this.callUpdatePrep(path, "unlink", true, true);
        }

    }

    unregisterPath(path: string, callback: (type: string) => void) {

        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;

        let listCallbacks: { (type: string): void; }[] | undefined = this.hash.get(path); //get

        if (listCallbacks != undefined) {
            const index = listCallbacks.indexOf(callback);
            if (index > -1) {
                listCallbacks.splice(index, 1);
            }

            if (listCallbacks.length == 0) {
                this.watcher.unwatch(path);
                this.hash.delete(path);
            }
        }

    }

}


export const FileSystemWatcher = Watcher.instance;

