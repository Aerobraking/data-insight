import { AbstractNode, AbstractLink, AbstractOverviewEntry } from "./OverviewData";
import { Exclude, Type } from "class-transformer";
import chokidar, { FSWatcher, WatchOptions } from "chokidar";

export class FolderNode extends AbstractNode {
    constructor(path: string) {
        super("folder");
        this.path = path;
    }
    path: string;
}

export class FolderLink extends AbstractLink<FolderNode>{
}

export class FolderOverviewEntry extends AbstractOverviewEntry<FolderNode>{

    constructor(path: string) {
        super("folder", new FolderNode(path));
        this.path = path;
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

    private ignoredFolders: string[] = [];

    @Exclude()
    private watcher: FSWatcher | undefined;

    syncStructure(): void {
    }

    startWatcher(): void {

        let _this = this;

        if (!this.watcher) {

            console.log("start watcher");

            this.watcher = chokidar.watch(this.path, {
                ignored: this.ignoredFolders, // ignore dotfiles
                persistent: true,
                depth: this.depth
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
                .on("addDir", (path: any) => {
                    let c = new FolderNode(path);
                    c.parent = _this.root;
                    _this.root.children.push(c);
                    _this.updateSimulationData();
                    console.log("add Dir: " + path);
                })
                .on("ready", (path: any) => {
                    console.log("READY");
                })
                .on("unlinkDir", (path: any) => {
                    console.log("remove Dir: " + path);
                });
        }

    }

    reactToDrop(e: DragEvent): void {

    }

}

 