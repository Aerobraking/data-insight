
const drivelist = require("drivelist");
import os from "os"; 
import { ipcRenderer } from "electron";

async function getDrives() {
    listDrives = [];
    const drives = await drivelist.list();
    console.log(drives);

    if (os.platform() == "darwin") {
        listDrives.push(new Drive("/Users", 0, "Users"));
    }

    for (let i = 0; i < drives.length; i++) {
        const d = drives[i];
        if (d.size && d.size > 0) {
            if (os.platform() == "darwin") {
                /*
                    mountpoints: Array(1)
                    0: {path: "/", label: "AmILab"}
                    length: 1
                    __proto__: Array(0)
                    partitionTableType: "gpt"
                    raw: "/dev/rdisk1"
                    size: 2000398934016 

                    sd card:
                    mountpoints: Array(1)
                    0: {path: "/Volumes/EOS_DIGITAL", label: "EOS_DIGITAL"} // we could only use Volumes, which shows all all volumes then.
                    length: 1
                    __proto__: Array(0)
                    partitionTableType: "gpt"
                    raw: "/dev/rdisk1"
                    size: 2000398934016 
                */
                if (d.mountpoints.length > 0) {
                    // const name = d.mountpoints[0] == "/" ? "/" : d.mountpoints[0].includes("/Volumes/")
                    listDrives.push(new Drive(d.mountpoints[0].path, Math.round(d.size), d.mountpoints[0].label));
                }

            } else if (os.platform() == "win32") {
                /*
                    mountpoints: Array(1)
                    0: {path: "E:\"}
                    length: 1
                    __proto__: Array(0)
                    partitionTableType: "gpt"
                    raw: "\\.\PhysicalDrive2"
                    size: 2000398934016 
                */
                if (d.mountpoints.length > 0) {
                    const path = d.mountpoints[0].path.replace("\\", "/");
                    listDrives.push(new Drive(path, Math.round(d.size), path.replaceAll("/", "")));
                }

            }

        }
    }
}

getDrives();

export const DriveListRoot: string = "root-drivelist";

export class Drive {

    constructor(path: string, size: number, name: string = path) {
        this.path = path;
        this.name = name;
        this.size = size;
    }
    path: string;
    name: string;
    size: number;
}

var listDrives: Drive[] = [];
  
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

