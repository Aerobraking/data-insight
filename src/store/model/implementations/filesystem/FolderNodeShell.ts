import { AbstractLink } from "../../app/overview/AbstractNode";
import { Exclude } from "class-transformer";
import { FSWatcher } from "chokidar";
import pathNodejs from "path";
import { Instance } from "./FileSystemWatcher";
import { FileSystemListener, FolderFeatureResult, FolderSyncFinished, FolderSyncResult } from "./FileSystemMessages";
import FolderNode from "./FolderNode";
import { AbstractNodeShell } from "../../app/overview/AbstractNodeShell";
import * as watcher from "../../../../utils/WatchSystemMain";



export class FolderLink extends AbstractLink<FolderNode>{
}

export class FolderNodeShell extends AbstractNodeShell<FolderNode> implements FileSystemListener {

    constructor(path: string | undefined) {
        super("folder", path ? path : "", new FolderNode(path ? pathNodejs.basename(path) : ""));
        this.root.shell = this;
    }

    public createNode(name: string) {
        return new FolderNode(name);
    }


    syncStructure(): void {
    }



    private ignoredFolders: string[] = [];

    @Exclude()
    renameMap: Map<string, NodeJS.Timeout> = new Map();

    @Exclude()
    interval: any = setInterval(this.handleEvents.bind(this), 6);
    @Exclude()
    eventStack: (FolderSyncResult | FolderFeatureResult | FolderSyncFinished)[] = [];

    watcherEvent = (type: string, path?: string) => {
        Instance.syncFolder(this);
        if (type == "unlinkdir" && path) {
            this.removeEntryPath(path);
        }
    };

    handleEvents(): void {
        s:
        for (let i = 0; i < 1; i++) {
            let event = this.eventStack.shift();
            if (event) {
                switch (event.type) {
                    case "foldersync":
                        const result: FolderSyncResult = event as unknown as FolderSyncResult;
                        this.addEntryPath(result.path, result.collection, result.collection ? result.childCount : 0);
                        return
                    case "folderfeatures":
                        this.addFeatures(event.path, event.features);
                        break;
                    case "folderdeepsyncfinished":
                        this.isSyncing = false;
                        break;
                    default:
                        break;
                }
            }
        }

    }

    event(e: FolderFeatureResult | FolderSyncResult | FolderSyncFinished): void {
        switch (e.type) {
            case "folderfeatures":
            case "folderdeepsyncfinished":
            case "foldersync":
                this.eventStack.push(e);
                break;
        }
    }

    getPath(): string {
        return this.path;
    }

    getID(): number {
        return this.id;
    }

    loadCollection(node: FolderNode) {
        if (node.isCollection()) {
            Instance.syncOpenedCollection(this, node.getPath(), Math.max(1, node.collectionData!.depth));
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

        //     this.watcher = chokidar.watch(this.path, {
        //         ignored: this.ignoredFolders, // ignore dotfiles
        //         persistent: true,
        //         depth: this.depth,
        //         usePolling: true,
        //         interval: 1500,
        //     });



        //     this.watcher
        //         .on("add", (path: any) => {
        //             //  console.log("add: " + path);
        //         })
        //         .on("change", (path: any) => {
        //             console.log("change: " + path);
        //         })
        //         .on("unlink", (path: any) => {
        //             console.log("unlink: " + path);
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
        //             console.log("READY");
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

