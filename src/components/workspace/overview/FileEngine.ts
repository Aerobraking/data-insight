import { AbstractNode, AbstractLink, AbstractOverviewEntry } from "./OverviewData";
import { Exclude, Type } from "class-transformer";
import chokidar, { FSWatcher, WatchOptions } from "chokidar";
import pathNodejs from "path";
import { Instance } from "./FileSystemWatcher";
import { FileSystemListener, FolderStatsResult, FolderSyncResult } from "./OverviewInterfaces";

export class FolderNode extends AbstractNode {
    constructor(name: string) {
        super("folder", name);
    }
}

export class FolderLink extends AbstractLink<FolderNode>{
}

export class FolderOverviewEntry extends AbstractOverviewEntry<FolderNode> implements FileSystemListener {

    constructor(path: string | undefined) {
        super("folder", path ? path : "", new FolderNode(path ? pathNodejs.basename(path) : ""));
        this.root.entry = this;
    }

    public get depth(): number {
        return this._depth;
    }

    public set depth(value: number) {
        this._depth = value;
        if (this.watcher) {
            this.watcher.options.depth = 1;
        }
    }

    public createNode(name: string) {
        return new FolderNode(name);
    }

    @Exclude()
    private watcher: FSWatcher | undefined;

    syncStructure(): void {
    }

    public initAfterLoading(): void {
        this.updateSimulationData();
        this.updateColumnForces();
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            n.entry = this;
            n.updateSimulation();
            for (let j = 0; j < n.getChildren().length; j++) {
                const c = n.getChildren()[j];
                c.parent = n;
            }
        }
    }

    private ignoredFolders: string[] = [];
    private _depth: number = 5;
    @Exclude()
    renameMap: Map<string, NodeJS.Timeout> = new Map();

    @Exclude()
    interval: any = setInterval(this.handleEvents.bind(this), 100);
    @Exclude()
    eventStack: (FolderSyncResult | FolderStatsResult)[] = [];

    handleEvents(): void {

        s:
        for (let i = 0; i < 10; i++) {
            let event = this.eventStack.shift();
            if (event) {
                switch (event.type) {
                    case "foldersync":
                        const result: FolderSyncResult = event as unknown as FolderSyncResult;
                        this.addEntryPath(result.path, result.collection, result.collection ? result.childCount : 0);
                        // break s;
                        break;
                    case "folderstats":
                        this.addStats(event.stats);
                        break;
                    default:
                        break;
                }
            }
        }

    }

    event(e: FolderStatsResult | FolderSyncResult): void {
        switch (e.type) {
            case "folderstats":
                this.eventStack.push(e);
                break;
            case "foldersync":
                this.eventStack.push(e);
                break;
        }
    }

    getPath(): string {
        return this.path;
    }

    getDepth(): number {
        return this._depth;
    }

    getID(): number {
        return this.id;
    }

    loadCollection(node: FolderNode) {
        console.log(node);
        
        Instance.syncFolderMan(this, node.getPath(), 1);
        node.parent?.removeChild(node);
    }

    createCollection(node: FolderNode) {
        node.createCollection();
    }

    stopWatcher(): void {

    }

    startWatcher(): void {

        /**
         * this starts the syncing of the folder for this entry.
         */
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

