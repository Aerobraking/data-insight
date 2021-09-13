import { AbstractNode, AbstractLink, AbstractOverviewEntry } from "./OverviewData";
import { Exclude, Type } from "class-transformer";
import chokidar, { FSWatcher, WatchOptions } from "chokidar";
import pathNodejs from "path";
import { fstat } from "original-fs";
import fs from "fs";

export class FolderNode extends AbstractNode {
    constructor(name: string) {
        super("folder", name);
    }


}

export class FolderLink extends AbstractLink<FolderNode>{
}

export class FolderOverviewEntry extends AbstractOverviewEntry<FolderNode>{

    constructor(path: string) {
        super("folder", path, new FolderNode(pathNodejs.dirname(path)));
        this.path = path;
        this.root.entry = this;
    }

    path: string;

    private _depth: number = 8;

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

    private ignoredFolders: string[] = [];

    @Exclude()
    private watcher: FSWatcher | undefined;

    syncStructure(): void {
    }

    renameList: string[] = [];
    renameMap: Map<string, NodeJS.Timeout> = new Map();

    startWatcher(): void {

        let _this = this;

        if (!this.watcher) {

            console.log("start watcher");

            this.watcher = chokidar.watch(this.path, {
                ignored: this.ignoredFolders, // ignore dotfiles
                persistent: true,
                depth: this.depth,
                usePolling: true,
            });

            this.watcher.on('raw', (event, path, { watchedPath }) => {
                // console.log("event: " + event);

                // if (event === 'rename') {
                //     let abs = watchedPath + pathNodejs.sep + path;
                //     if (this.renameList.length > 0) {
                //         _this.renameByPaths(this.renameList[0], abs);
                //         this.renameList = [];
                //         return;
                //     }
                //     console.log("rename: " + abs);

                //     this.renameList.push(abs)
                // }
            });
            this.watcher
                .on("add", (path: any) => {
                    //  console.log("add: " + path);
                })
                .on("change", (path: any) => {
                    console.log("change: " + path);
                })
                .on("unlink", (path: any) => {
                    console.log("unlink: " + path);
                })
                .on("addDir", (pathNew: any) => {

                    let paths: string[] = Array.from(this.renameMap.keys());
                    let renameCase = false;
                    let renamendPath: string = "";
                    s:
                    for (let i = 0; i < paths.length; i++) {
                        const p: string = paths[i];
                        const node = _this.getNodeByPath(p);
                        let stat = 0;
                        let filecount = 0;
                        if (node) {
                            // node found, test if it is the added Dir by comparing their children
                            fs.readdirSync(pathNew).forEach(file => {
                                filecount++;
                                let name = pathNodejs.basename(file);
                                stat += node.getChildren().find(c => c.name == name) ? 1 : 0;
                            });
                            let similiar = stat / filecount;
                            console.log("similiar from : " + pathNew);
                            console.log("similiar to   : " + p);
                            console.log("similiar value: " + similiar);
                            console.log("liste length  : " + paths.length);

                            console.log("#");


                            if (!isNaN(similiar) && similiar > 0.4) {
                                renameCase = true;
                                renamendPath = p;
                                let timeout = this.renameMap.get(p)
                                if (timeout) {
                                    clearTimeout(timeout);
                                    this.renameMap.delete(p);
                                }
                                break s;
                            }
                        } else {
                            console.log("node not found: " + p);

                        }
                    }

                    if (renameCase) {
                        for (let i = 0; i < paths.length; i++) {
                            const p: string = paths[i];
                            if (p != renamendPath) {
                                let timer = this.renameMap.get(p);
                                if (timer) {

                                    /**
                                     * Only 
                                     */
                                    if (p.includes(renamendPath)
                                        && p.replace(renamendPath, pathNew) != p) {
                                        console.log("subfolder renamed from: " + p + " to: " + p.replace(renamendPath, pathNew));
                                        this.renameMap.set(p.replace(renamendPath, pathNew), timer);
                                        this.renameMap.delete(p);
                                    }

                                }
                            }

                        }
                        _this.renameByPaths(renamendPath, pathNew);
                        console.log("## rename Dir: " + pathNew);
                    } else {
                        _this.addEntryPath(pathNew);

                        console.log("## add Dir: " + pathNew);
                    }
                    console.log(" ");



                    _this.updateSimulationData(false);
                })
                .on("ready", (path: any) => {
                    console.log("READY");
                })
                .on("unlinkDir", (path: any) => {
                    /*
                    bei jedem neuem gelöschten ordner resetten wir das timeout und sammeln die ordner
                    so lange in einer liste.
                    */

                    /**
                     * Der geänderte Ordner kommt rein. Wir finden ihn in der Liste und nennen ihn um
                     * 
                     * Die Subordner kommen, finden jedoch per getNodeByPath() ihren ordner nicht mehr
                     * da dieser ja jetzt anders heißt. 
                     * 
                     * Wir müssen also beim renaming die removeListe durchgehen und die absoluten pfade
                     * ersetzen wenn wir welche finden.
                     */
                    let timer = setTimeout((p) => {
                        _this.removeEntryPath(p);
                        _this.renameMap.delete(p);
                    }, 400, path);
                    this.renameMap.set(path, timer);
                    this.renameList.push(path);


                    if (!this.renameList.includes(path)) {
                    } else {
                        console.log("dir will not be removed, as it is marked for renaming: " + path);
                    }

                });
        }

    }

    reactToDrop(e: DragEvent): void {

    }

}

