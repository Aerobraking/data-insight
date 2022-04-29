import { Exclude } from "class-transformer";
import pathNodejs from "path";
import { AbstractNodeTree } from "@/core/model/workspace/overview/AbstractNodeTree";
import { FileSystemListener, FolderSyncResult, FolderFeatureResult, FolderSyncFinished, SyncMessageType } from "../utils/FileSystemMessages";
import { Instance } from "../utils/FileSystemScanConnector";
import FolderNode from "./FolderNode";
import * as watcher from "../utils/FileSystemWatcherConnector";
import { doBenchmark } from "@/core/utils/Benchmark";

/**
 * Implements the AbstractNodeTree for creating a directory tree structure.
 * It uses a webworker which watches for changes in the file system to keep the structure synchronized. 
 */
export class FolderNodeTree extends AbstractNodeTree<FolderNode> implements FileSystemListener {

    constructor(path: string | undefined) {
        super("folder", path ? path : "", new FolderNode(path ? pathNodejs.basename(path) : ""));
        this.root.tree = this;
    }

    public createNodeInstance(name: string) {
        return new FolderNode(name);
    }

    syncStructure(): void { }

    @Exclude()
    renameMap: Map<string, NodeJS.Timeout> = new Map();

    /**
     * How quickly are the events from the WebWorker processed.
     */
    @Exclude()
    interval: any = setInterval(this.handleEvents.bind(this), 55);

    /**
     * We use Stacks for storing the events from the WebWorker. This way we can process them one by one
     * without blocking the main thread for too long.
     */
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
                newNodes.push({ path: e.path, collection: e.collection ? { size: e.childCount, depth: 0 } : undefined });
            }
        }

        if (newNodes.length > 0) this.addNodesByPaths(newNodes, true);

        const newFeatures = [];
        features:
        for (let i = 0; i < 7; i++) {
            let event = this.eventStackFeatures.shift();
            if (event) {
                switch (event.type) {
                    case SyncMessageType.folderfeatures:
                        newFeatures.push({ path: event.path, features: event.features });
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
            case SyncMessageType.folderdeepsyncfinished:
                if (doBenchmark) console.log("Time for Syncing: ", (performance.now() - this.timeForSinc) / 1000, "seconds");
            case SyncMessageType.folderfeatures:
                this.eventStackFeatures.push(e);
                break;
            case SyncMessageType.foldersync:
                this.eventStack.push(e);
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
        watcher.FSWatcherConnectorInstance.unregisterPath(this.path, this.watcherEvent, true);
    }

    timeForSinc: number = 0;

    startWatcher(): void {
        this.timeForSinc = performance.now();
        watcher.FSWatcherConnectorInstance.registerPath(this.path, this.watcherEvent, true);

        /**
         * this starts the syncing of the folder for this entry.
         */
        this.isSyncing = true;
        Instance.syncFolder(this);
    }

}

