import { AbstractNode, AbstractLink, AbstractRootNode, TreeStructureHandler } from "./OverviewEngine";
import { Exclude, Type } from "class-transformer";
import chokidar, { FSWatcher, WatchOptions } from "chokidar";




export class FolderNode extends AbstractNode<FolderNode>{
    constructor(path: string) {
        super();
        this.path = path;
    }
    path: string;
}

export class FolderLink extends AbstractLink<FolderNode>{

}

export class FolderRootNode extends AbstractRootNode<FolderNode>{
    constructor(path: string) {
        super(new FolderNode(path));
        this.path = path;
    }

    path: string;

    private _depth: number = 0;

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
            this.watcher = chokidar.watch(this.path, {
                ignored: this.ignoredFolders, // ignore dotfiles
                persistent: true,
                depth: this.depth
            });

            this.watcher
                .on("add", (path: any) => {
                    console.log("add: " + path);
                })
                .on("change", (path: any) => {
                    console.log("change: " + path);
                })
                .on("unlink", (path: any) => {
                    console.log("unlink: " + path);
                })
                .on("addDir", (path: any) => {
                    _this.root.children.push(new FolderNode(path));
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


export class FolderStructureHandler extends TreeStructureHandler<FolderNode, FolderRootNode> {

    constructor(root: FolderRootNode) {
        super(root);
    }

    syncStructure(): void {


    }

    startWatcher(): void {

    }

    reactToDrop(e: DragEvent): void {

    }
}