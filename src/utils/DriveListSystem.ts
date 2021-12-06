import { FSWatcher } from "chokidar";

import chokidar from "chokidar";
import fs from "fs";
const drivelist = require("drivelist");

async function getDrives() {
    const drives = await drivelist.list();
    console.log(drives);
    for (let i = 0; i < drives.length; i++) {
        const d = drives[i]; 
        listDrives.push(new Drive(d.mountpoints[0].path.replace("\\","/"), Math.round(d.size )));
    }
}

getDrives();

export const DriveListRoot: string = "root-drivelist";

export class Drive {

    constructor(name: string, size: number) {
        this.name = name;
        this.size = size;
    }

    name: string;
    size: number;
}

const listDrives: Drive[] = [];

interface Hash {
    [details: string]: { (): void; }[];
}

export class DriveListSystem {

    private hash: Map<String, { (): void; }[]> = new Map();
    private static _instance = new DriveListSystem();
    private constructor() {

    }

    public getDrives(): Drive[] {
        return listDrives;
    }

    private callUpdate(path: string): void {

        // try {
        //     path = path.replace(/\\/g, "/");

        //     path = path.endsWith("/") ? path.slice(0, -1) : path;

        //     console.log(path);

        //     let listCallbacks: { (): void; }[] | undefined = this.hash.get(path); //get
        //     if (listCallbacks != undefined) {
        //         for (let index = 0; index < listCallbacks.length; index++) {
        //             const c = listCallbacks[index];
        //             c();
        //         }
        //     }
        // } catch (err) {
        //     console.error("no access!");
        // }
    }

    static get instance() {
        return this._instance;
    }

    registerPath(path: string, callback: () => void) {

        // path = path.replace(/\\/g, "/");

        // try {

        //     let listCallbacks: { (): void; }[] | undefined = this.hash.get(path);

        //     if (listCallbacks == undefined) {
        //         listCallbacks = [];

        //         path = path.endsWith("/") ? path.slice(0, -1) : path;

        //         fs.accessSync(path, fs.constants.R_OK);
        //         this.watcher.add(path);

        //         this.hash.set(path, listCallbacks);

        //     }

        //     listCallbacks.push(callback);
        // } catch (err) {
        //     console.error("no access!");
        // }

    }

    unregisterPath(path: string, callback: () => void) {

        // path = path.replace(/\\/g, "/");

        // let listCallbacks: { (): void; }[] | undefined = this.hash.get(path); //get

        // if (listCallbacks != undefined) {
        //     const index = listCallbacks.indexOf(callback);
        //     if (index > -1) {
        //         listCallbacks.splice(index, 1);
        //     }

        //     if (listCallbacks.length == 0) {
        //         this.watcher.unwatch(path);
        //         this.hash.delete(path);
        //     }
        // }

    }

}


export const DriveListSystemInstance = DriveListSystem.instance;

