import { Exclude } from "class-transformer";
import pathNodejs from "path";
import { AbstractNodeShell } from "@/core/model/overview/AbstractNodeShell";
import { FileSystemListener, FolderSyncResult, FolderFeatureResult, FolderSyncFinished } from "../utils/FileSystemMessages";
import { Instance } from "../utils/FileSystemWatcher";
import FolderNode from "./FolderNode";
import * as watcher from "../utils/WatchSystemMain";

export class FolderNodeShell extends AbstractNodeShell<FolderNode> implements FileSystemListener {

    constructor(path: string | undefined) {
        super("folder", path ? path : "", new FolderNode(path ? pathNodejs.basename(path) : ""));
        this.root.shell = this;
    }

    public createNode(name: string) {
        return new FolderNode(name);
    }

    syncStructure(): void { }

    @Exclude()
    renameMap: Map<string, NodeJS.Timeout> = new Map();

    @Exclude()
    interval: any = setInterval(this.handleEvents.bind(this), 55);
    @Exclude()
    eventStack: (FolderSyncResult)[] = [];
    @Exclude()
    eventStackFeatures: (FolderFeatureResult | FolderSyncFinished)[] = [];

    watcherEvent = (type: string, path?: string) => {
        Instance.syncFolder(this);
        if (type == "unlinkdir" && path) {
            this.removeEntryPath(path);
        }
    };

    handleEvents(): void {

        const newNodes = [];
        nodes:
        for (let i = 0; i < 6; i++) {
            let e = this.eventStack.shift();
            if (e) {
                newNodes.push({ path: e.path, isCollection: e.collection, collectionSize: e.collection ? e.childCount : 0 });
            }
        }

        if (newNodes.length > 0) this.addEntryPaths(newNodes, true);

        const newFeatures = [];
        features:
        for (let i = 0; i < 5; i++) {
            let event = this.eventStackFeatures.shift();
            if (event) {
                switch (event.type) {
                    case "folderfeatures":
                        newFeatures.push({ path: event.path, features: event.features });
                        // this.addFeatures(event.path, event.features);
                        break;
                    // case "folderdeepsyncfinished":
                    //     this.isSyncing = false;
                    //     break;
                    default:
                        break;
                }
            }
        }

        if (newFeatures.length > 0) this.addFeaturesList(newFeatures);

        if (this.eventStack.length == 0 && this.eventStackFeatures.length == 0) this.isSyncing = false;

    }

    event(e: FolderFeatureResult | FolderSyncResult | FolderSyncFinished): void {
        switch (e.type) {
            case "folderfeatures":
            case "folderdeepsyncfinished":
                this.eventStackFeatures.push(e);
                break;
            case "foldersync":
                this.eventStack.push(e);
                break;
        }
    }

    getName() {
        return this.path;//+ " " + this.nodes.length + " - " + (this.customData["heat"] ? this.customData["heat"].v : "");
    }

    getPath(): string {
        return this.path;
    }

    getID(): number {
        return this.id;
    }

    loadCollection(node: FolderNode, useSavedDepth: boolean = false) {
        if (node.isCollection()) {
            Instance.syncOpenedCollection(this, node.getPath(), Math.max(1, useSavedDepth ? node.collectionData!.depth : 1));
            node.collectionData = undefined;
        }
    }

    stopWatcher(): void {
        watcher.FileSystemWatcher.unregisterPath(this.path, this.watcherEvent, true);
    }

    startWatcher(): void {

        watcher.FileSystemWatcher.registerPath(this.path, this.watcherEvent, true);

        /**
         * this starts the syncing of the folder for this entry.
         */
        this.isSyncing = true;
        Instance.syncFolder(this);

        // let _this = this;
        // if ( !this.watcher) {



        //     this.watcher
        //         .on("add", (path: any) => { 
        //         })
        //         .on("change", (path: any) => { 
        //         })
        //         .on("unlink", (path: any) => { 
        //         })
        //         .on("addDir", (pathNew: any) => {

        //             let paths: string[] = Array.from(this.renameMap.keys());
        //             let renameCase = false;
        //             let renamendPath: string = "";
        //             s:
        //             for (let i = 0; i < paths.length; i++) {
        //                 const p: string = paths[i];
        //                 const node = _this.getNodeByPath(p);
        //                 let stat = 0;
        //                 let filecount = 0;
        //                 if (node) {
        //                     // node found, test if it is the added Dir by comparing their children
        //                     fs.readdirSync(pathNew).forEach(file => {
        //                         filecount++;
        //                         let name = pathNodejs.basename(file);
        //                         stat += node.getChildren().find(c => c.name == name) ? 1 : 0;
        //                     });
        //                     let similiar = stat / filecount;

        //                     /**
        //                      * This folder was renamed, remove the timer for deleting
        //                      */
        //                     if (!isNaN(similiar) && similiar > 0.4) {
        //                         renameCase = true;
        //                         renamendPath = p;
        //                         let timeout = this.renameMap.get(p)
        //                         if (timeout) {
        //                             clearTimeout(timeout);
        //                             this.renameMap.delete(p);
        //                         }
        //                         break s;
        //                     }
        //                 }
        //             }

        //             if (renameCase) {
        //                 /**
        //                  * sub folders of the rename folders may also be in our renaming list. 
        //                  * So test if they are and rename the folder in these paths. This way they will also be found when there addDir Event is fired and thus not be deleted.
        //                  */
        //                 for (let i = 0; i < paths.length; i++) {
        //                     const p: string = paths[i];
        //                     if (p != renamendPath) {
        //                         let timer = this.renameMap.get(p);
        //                         if (timer && p.includes(renamendPath)
        //                             && p.replace(renamendPath, pathNew) != p) {
        //                             this.renameMap.set(p.replace(renamendPath, pathNew), timer);
        //                             this.renameMap.delete(p);
        //                         }
        //                     }
        //                 }

        //                 // rename the node
        //                 _this.renameByPaths(renamendPath, pathNew);
        //             } else {
        //                 /**
        //                  * Make sure the events happen at least with 30ms between them  
        //                  */
        //                 var timeDiff = performance.now() - this.endTime; //in ms 
        //                 this.endTime = performance.now();
        //                 this.eventStack.push({ path: pathNew, type: "add" });
        //             }


        //         })
        //         .on("ready", (path: any) => { 
        //         })
        //         .on("unlinkDir", (path: any) => {
        //             /**
        //              * Dir will be deleted with delay so when an add event happens we can
        //              * test for a rename situation
        //              */
        //             let timer = setTimeout((p) => {
        //                 _this.removeEntryPath(p);
        //                 _this.renameMap.delete(p);
        //             }, 400, path);
        //             this.renameMap.set(path, timer);
        //             this.renameList.push(path);

        //         });
        // }

    }

    reactToDrop(e: DragEvent): void {

    }

}

