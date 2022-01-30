
const drivelist = require("drivelist");
import { ipcRenderer } from "electron";

async function getDrives() {
    listDrives = [];
    const drives = await drivelist.list();
    console.log(drives);
    for (let i = 0; i < drives.length; i++) {
        const d = drives[i];
        if (d.size && d.size > 0) {
            listDrives.push(new Drive(d.mountpoints[0].path.replace("\\", "/"), Math.round(d.size)));
        }
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

var listDrives: Drive[] = [];

interface Hash {
    [details: string]: { (): void; }[];
}

export class DriveListSystem {

    private hash: Map<String, { (): void; }> = new Map();
    private static _instance = new DriveListSystem();
    private constructor() {
        const _this = this;
        ipcRenderer.on("usb-update", function (event: any) {
            getDrives().finally(() => {
                setTimeout(() => {
                    for (let [key, value] of _this.hash) {
                        value();
                    }
                }, 250);
            });
        }
        );

    }

    public getDrives(): Drive[] {
        return listDrives;
    }

    static get instance() {
        return this._instance;
    }

    register(id: string, callback: () => void) {
        this.hash.set(id, callback);
    }

    unregister(id: string) {
        this.hash.delete(id);
    }

}


export const DriveListSystemInstance = DriveListSystem.instance;

