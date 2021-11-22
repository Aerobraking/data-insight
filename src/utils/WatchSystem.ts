import { FSWatcher } from "chokidar";

const chokidar = require("chokidar");
import fs from "fs";
const pathSys = require("path");
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
            recursive: false,
        });

        this.watcher
            .on("ready", (path: any) => {

                // console.log("READY");

                this.watcher.on("add", (path: any) => {
                    this.callUpdate(path);
                    //  console.log("add file: " + path);
                })
                    .on("change", (path: any) => {
                        this.callUpdate(path);
                    })
                    .on("unlink", (path: any) => {
                        this.callUpdate(path);
                    })
                    .on("addDir", (path: any) => {
                        this.callUpdate(path);
                    })
                    .on("unlinkDir", (path: any) => {
                        this.callUpdate(path);
                    });
            })

    }

    private callUpdate(path: string): void {

        let dir: string = pathSys.dirname(path);

        dir = pathSys.normalize(dir).replace(/\\/g, "/");

        console.log(dir);

        let listCallbacks: { (): void; }[] | undefined = this.hash.get(dir); //get
        if (listCallbacks != undefined) {
            for (let index = 0; index < listCallbacks.length; index++) {
                const c = listCallbacks[index];
                c();
            }
        }
    }

    static get instance() {
        return this._instance;
    }

    registerPath(path: string, callback: () => void) {

        path = pathSys.normalize(path).replace(/\\/g, "/");

        let listCallbacks: { (): void; }[] | undefined = this.hash.get(path); //get


        if (listCallbacks == undefined) {
            listCallbacks = [];
            try {
                fs.accessSync(path, fs.constants.R_OK);
                this.watcher.add(path);
            } catch (err) {
                console.error("no access!");
            }
            this.hash.set(path, listCallbacks);
        }

        console.log("register: " + path);

        listCallbacks.push(callback);

        // console.log(this.hash);
    }

    unregisterPath(path: string, callback: () => void) {


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

        // console.log(this.hash);

    }

}


export const FileSystemWatcher = Watcher.instance;

