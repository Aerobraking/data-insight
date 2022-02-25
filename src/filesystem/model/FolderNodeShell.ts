import { Exclude } from "class-transformer";
import pathNodejs from "path";
import { AbstractNodeShell } from "@/core/model/workspace/overview/AbstractNodeShell";
import { FileSystemListener, FolderSyncResult, FolderFeatureResult, FolderSyncFinished } from "../utils/FileSystemMessages";
import { Instance } from "../utils/FileSystemWatcher";
import FolderNode from "./FolderNode";
import * as watcher from "../utils/WatchSystemMain";
import { doBenchmark } from "@/core/utils/Benchmark";

export class FolderNodeShell extends AbstractNodeShell<FolderNode> implements FileSystemListener {

    constructor(path: string | undefined) {
        super("folder", path ? path : "", new FolderNode(path ? pathNodejs.basename(path) : ""));
        this.root.shell = this;
    }

    public createNodeInstance(name: string) {
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
            this.removeNodeByPath(path);
        }
    };

    public initAfterLoading(): void {
        super.initAfterLoading();
        this.startWatcher();
    }

    handleEvents(): void {

        const newNodes = []; 
        for (let i = 0; i < 8; i++) {
            let e = this.eventStack.shift();
            if (e) {
                newNodes.push({ path: e.path, isCollection: e.collection, collectionSize: e.collection ? e.childCount : 0 });
            }
        }

        if (newNodes.length > 0) this.addNodesByPaths(newNodes, true);

        const newFeatures = [];
        features:
        for (let i = 0; i < 7; i++) {
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
        switch (e.type) {
            case "folderdeepsyncfinished":
                if (doBenchmark) console.log("Time for Syncing: ", (performance.now() - this.timeForSinc) / 1000, "seconds");
                break;
        }
    }

    getName() {
        return this.path;
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

    timeForSinc: number = 0;

    startWatcher(): void {
        this.timeForSinc = performance.now();
        watcher.FileSystemWatcher.registerPath(this.path, this.watcherEvent, true);

        /**
         * this starts the syncing of the folder for this entry.
         */
        this.isSyncing = true;
        Instance.syncFolder(this);
    }

}

