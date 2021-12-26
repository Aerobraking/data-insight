import { FSWatcher } from "chokidar";

import chokidar from "chokidar";
import fs from "fs";
interface Hash {
    [details: string]: { (): void; }[];
}

export class Watcher {

    private hash: Map<String, { (): void; }[]> = new Map();
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
                path = path.replace(/\\/g, "/");
                this.callUpdate(path.substring(0, path.lastIndexOf("/")));
            })
            .on("change", (path: any) => {
                path = path.replace(/\\/g, "/");
                this.callUpdate(path);
            })
            .on("unlink", (path: any) => {
                path = path.replace(/\\/g, "/");
                this.callUpdate(path.substring(0, path.lastIndexOf("/")));
            })
            .on("addDir", (path: any) => { 
                path = path.replace(/\\/g, "/");
                this.callUpdate(path.substring(0, path.lastIndexOf("/")));
            })
            .on("unlinkDir", (path: any) => {
                path = path.replace(/\\/g, "/");
                this.callUpdate(path.substring(0, path.lastIndexOf("/")));
            });

    }

    private callUpdate(path: string): void {

        try {
            path = path.replace(/\\/g, "/");

            path = path.endsWith("/") ? path.slice(0, -1) : path;

            console.log(path);

            let listCallbacks: { (): void; }[] | undefined = this.hash.get(path); //get
            if (listCallbacks != undefined) {
                for (let index = 0; index < listCallbacks.length; index++) {
                    const c = listCallbacks[index];
                    c();
                }
            }
        } catch (err) {
            console.error("no access!");
        }
    }

    static get instance() {
        return this._instance;
    }

    registerPath(path: string, callback: () => void) {

        path = path.replace(/\\/g, "/");

        try {

            let listCallbacks: { (): void; }[] | undefined = this.hash.get(path);

            if (listCallbacks == undefined) {
                listCallbacks = [];

                path = path.endsWith("/") ? path.slice(0, -1) : path;

                fs.accessSync(path, fs.constants.R_OK);
                this.watcher.add(path);

                this.hash.set(path, listCallbacks);

            }
 
            listCallbacks.push(callback);
        } catch (err) {
            console.error("no access!");
        }

    }

    unregisterPath(path: string, callback: () => void) {

        path = path.replace(/\\/g, "/");
        path = path.endsWith("/") ? path.slice(0, -1) : path;

        let listCallbacks: { (): void; }[] | undefined = this.hash.get(path); //get
  
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

