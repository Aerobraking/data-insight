// import { FSWatcher } from "chokidar";

// import chokidar from "chokidar";
// import fs from "fs";
// import pathNjs from "path";

// interface WatcherListener {
//     (type: string, path?: string): void;
// }


// interface MapCallbacks extends Map<string, WatcherListener[]> {

// }


// export class Watcher {

//     private hash: MapCallbacks = new Map();
//     private hashRecursive: MapCallbacks = new Map();
//     private static _instance = new Watcher();

//     public reset() {
//         this.hash.clear();
//         this.hashRecursive.clear(); 
//     }

//     private watcher: FSWatcher;
//     private watcherRecursive: FSWatcher;
//     private constructor() {

//         this.watcherRecursive = chokidar.watch([], {
//             ignored: /(^|[\/\\])\../, // ignore dotfiles
//             persistent: true,
//             ignoreInitial: true,
//             /**
//              * both settings are important for the performance.
//              * "alwaysStat: false"  disables the creation of the stats object for each file in a folder, which speedup things a lot
//              * "depth:0"            makes sure only the current directory is watched and no subdirectories.
//              */
//              usePolling:true,
//             useFsEvents: false,
//             interval:10000,
//             alwaysStat: false,
//             followSymlinks: false,
//             depth: 4
//         });

//         this.watcher = chokidar.watch([], {
//             ignored: /(^|[\/\\])\../, // ignore dotfiles
//             persistent: true,
//             ignoreInitial: true,
//             /**
//              * both settings are important for the performance.
//              * "alwaysStat: false"  disables the creation of the stats object for each file in a folder, which speedup things a lot
//              * "depth:0"            makes sure only the current directory is watched and no subdirectories.
//              */
//             alwaysStat: false,
//             depth: 0
//         });



//         this.watcher
//             .on("ready", (path: any) => {
//             }).on("add", (path: any) => {
//                 // also call an update for the directory of the file, in case a folder view has this directory open.
//                 this.callUpdatePrep(path, "add", this.hash);
//             })
//             .on("change", (path: any) => {
//                 this.callUpdatePrep(path, "change", this.hash);
//             })
//             .on("unlink", (path: any) => {
//                 this.callUpdatePrep(path, "unlink", this.hash);
//             })
//             .on("addDir", (path: any) => {
//                 this.callUpdatePrep(path, "adddir", this.hash);
//             })
//             .on("unlinkDir", (path: any) => {
//                 this.callUpdatePrep(path, "unlinkdir", this.hash);
//             });

//         this.watcherRecursive
//             .on("ready", (path: any) => {
//             }).on("add", (path: any) => {
//                 // also call an update for the directory of the file, in case a folder view has this directory open.
//                 this.callUpdatePrep(path, "add", this.hashRecursive);
//             })
//             .on("change", (path: any) => {
//                 this.callUpdatePrep(path, "change", this.hashRecursive);
//             })
//             .on("unlink", (path: any) => {
//                 this.callUpdatePrep(path, "unlink", this.hashRecursive);
//             })
//             .on("addDir", (path: any) => {
//                 this.callUpdatePrep(path, "adddir", this.hashRecursive);
//             })
//             .on("unlinkDir", (path: any) => {
//                 this.callUpdatePrep(path, "unlinkdir", this.hashRecursive);
//             });
//     }

//     private callUpdatePrep(path: string, type: string, map: MapCallbacks) {
  
//         path = path.replace(/\\/g, "/");
//         path = path.endsWith("/") ? path.slice(0, -1) : path;
//         this.callUpdate(path, type, map); // update for file / dir
//         if (path.includes("/")) this.callUpdate(path.substring(0, path.lastIndexOf("/")), "change", map); // update for parent dir
//     }

//     private isSubDir(parent: string, dir: string) {
//         const relative = pathNjs.relative(parent, dir);
//         return relative && !relative.startsWith('..') && !pathNjs.isAbsolute(relative);
//     }

//     private callUpdate(path: string, type: string, map: MapCallbacks): void {

//         const call = (p: string) => {
//             try {
//                 let listCallbacks: { (type: string, path?: string): void; }[] | undefined = map.get(p); //get
//                 if (listCallbacks != undefined) {
//                     for (let index = 0; index < listCallbacks.length; index++) {
//                         const c = listCallbacks[index];
//                         c(type, path);
//                     }
//                 }
//             } catch (err) {
//                 console.error("no access!");
//             }
//         };

//         let defaultCall = true;

//         map.forEach((value: WatcherListener[], key: string, map: MapCallbacks) => {
//             if (this.isSubDir(key, path)) call(key), defaultCall = false;
//         });

//         if (defaultCall) call(path);

//     }

//     static get instance() {
//         return this._instance;
//     }

//     registerPath(path: string, callback: (type: string, path?: string) => void, recursive: boolean = false) {

//         path = path.replace(/\\/g, "/");
//         path = path.endsWith("/") ? path.slice(0, -1) : path;

//         const mapToUse = recursive ? this.hashRecursive : this.hash;
//         const watcherToUse = recursive ? this.watcherRecursive : this.watcher;

//         let listCallbacks: { (type: string): void; }[] | undefined = mapToUse.get(path);

//         if (listCallbacks == undefined) {
//             listCallbacks = [];
//             watcherToUse.add(path);
//             mapToUse.set(path, listCallbacks);
//             //   hinterlegen ob eine datei existiert oder nicht um das zu melden. per watcher testen ob die datei wieder hergestellt wird was ja eh schon gemacht wird oder?.
//             try {
//                 fs.accessSync(path, fs.constants.R_OK);
//             } catch (err) {
//                 // inform about non existing file
//                 this.callUpdatePrep(path, "unlink", mapToUse);
//             }
//         }
//         listCallbacks.push(callback);


//     }

//     unregisterPath(path: string, callback: (type: string, path?: string) => void, recursive: boolean = false) {

//         path = path.replace(/\\/g, "/");
//         path = path.endsWith("/") ? path.slice(0, -1) : path;

//         const mapToUse = recursive ? this.hashRecursive : this.hash;
//         const watcherToUse = recursive ? this.watcherRecursive : this.watcher;

//         let listCallbacks: { (type: string): void; }[] | undefined = mapToUse.get(path); //get

//         if (listCallbacks != undefined) {
//             const index = listCallbacks.indexOf(callback);
//             if (index > -1) {
//                 listCallbacks.splice(index, 1);
//             }

//             if (listCallbacks.length == 0) {
//                 watcherToUse.unwatch(path);
//                 mapToUse.delete(path);
//             }
//         }

//     }

// }


// // export const FileSystemWatcher = Watcher.instance;

