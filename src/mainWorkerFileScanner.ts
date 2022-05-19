/**
 * This is the main entry point for a worker Thread created with a hidden window.
 * It handles the scanning of the file system for the overview data.
 */
import 'reflect-metadata';
import fs from 'fs';
import { ipcRenderer } from "electron";
import { FolderSync, FolderSyncResult, FolderFeatureResult, SyncMessageType } from './filesystem/utils/FileSystemMessages';
import { FeatureDataList, FeatureDataSum, FeatureDataMedian } from './core/model/fileactivity/overview/FeatureData';
import path from "path";
import { Dirent } from 'fs-extra';
import { FeatureType } from './core/model/fileactivity/overview/FeatureType';
import IPCMessageType from './IpcMessageTypes';

/**
 * An Object that can contain any type of FeatureData
 */
type FolderNodeFeatures = {
    [FeatureType.FolderLastModify]: FeatureDataMedian,
    [FeatureType.FolderSize]: FeatureDataSum,
    [FeatureType.FolderQuantity]: FeatureDataSum,
    [FeatureType.FolderFileTypes]: FeatureDataList,
}

// outputs every message send via ipc.
ipcRenderer.on("log", (event, log) => {
    //  console.log("log", log);
});

/**
 * We scan the complete folder and send back first the folder structure 
 * and then the stats for each folder based on their files.
 */
ipcRenderer.on(IPCMessageType.RenderToFileScan,
    function (event: any, payload: any) {

        if (payload.type === "folderdeepsync") {

            let msg: FolderSync = payload;

            // msg.depth
            const maxDepth = msg.depth;

            console.log("Start folder syncing");

            let listFoldersToSync: FolderSyncResult[] = [];
            let listFoldersToSyncComplete: FolderSyncResult[] = [];

            function countAndScanFolders(pathCurrent: string, depth: number = 0): void {

                try {
                    let files: Dirent[] = fs.readdirSync(pathCurrent, { withFileTypes: true });
                    let folders: string[] = [];

                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const absolutePath = pathCurrent + "/" + file.name;

                        // const stats = fs.statSync(absolutePath);
                        if (file.isDirectory() && !file.name.includes(".") && msg.depth < 100 && (msg.depth == 0 || depth <= maxDepth)) {
                            folders.push(absolutePath);
                        }


                    }

                    const depthChildren = depth + 1;

                    const isCollection: boolean = (folders.length >= msg.collectionSize && depthChildren > 1) || depthChildren > maxDepth || depthChildren > 100;

                    const e: any = { id: msg.id, childCount: folders.length, path: pathCurrent, type: SyncMessageType.foldersync, collection: isCollection };
                    listFoldersToSync.push(e);
                    listFoldersToSyncComplete.push(e);


                    if (listFoldersToSync.length > 5) {
                        listFoldersToSync.forEach(e => ipcRenderer.send(IPCMessageType.FileScanToRender, e))
                        listFoldersToSync = [];
                    }


                    for (let i = 0; i < folders.length; i++) {
                        const f = folders[i];
                        if (!isCollection) {
                            countAndScanFolders(f, depthChildren);
                        }
                    }
                } catch (error) {
                    console.error("Error in scanning the folder ", path, error);

                }

            }

            countAndScanFolders(msg.path);

            listFoldersToSync.forEach(e => ipcRenderer.send(IPCMessageType.FileScanToRender, e))

            console.log("Scanned folders, now extract features");

            let updateSteps = 0;

            function calculateMedian(features: FolderNodeFeatures) {
                features[FeatureType.FolderLastModify].m = Math.floor(features[FeatureType.FolderLastModify].m as number / features[FeatureType.FolderLastModify].c);
            }

            function handleDirectory(pathF: string, files: Dirent[], features: FolderNodeFeatures, sendResults: boolean = true) {

                /**
                 * Add the stats from all files together
                 */

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const absolutePath = pathF + "/" + file.name;

                    if (file.isFile()) {

                        const stats = fs.statSync(absolutePath);

                        // feature: size feature
                        if (features[FeatureType.FolderSize]) features[FeatureType.FolderSize].s += stats.size;

                        // feature: file quantity feature
                        features[FeatureType.FolderQuantity].s += 1;

                        // feature: file type feature
                        const fileExtention = path.extname(file.name);
                        if (features[FeatureType.FolderFileTypes].l[fileExtention] == undefined) {
                            features[FeatureType.FolderFileTypes].l[fileExtention] = 0;
                        }
                        features[FeatureType.FolderFileTypes].l[fileExtention] += 1;

                        // feature: last modify time
                        if (!isNaN(stats.mtimeMs)) {
                            features[FeatureType.FolderLastModify].m == undefined ? features[FeatureType.FolderLastModify].m = 0 : ""; // init value when undefined
                            features[FeatureType.FolderLastModify].m = features[FeatureType.FolderLastModify].m as number + Math.floor(stats.mtimeMs / 1000);
                            features[FeatureType.FolderLastModify].c += 1;
                        }

                        // feature: last access time
                        if (!isNaN(stats.atimeMs)) {
                            features[FeatureType.FolderLastModify].m == undefined ? features[FeatureType.FolderLastModify].m = 0 : ""; // init value when undefined
                            features[FeatureType.FolderLastModify].m = features[FeatureType.FolderLastModify].m as number + Math.floor(stats.atimeMs / 1000);
                            features[FeatureType.FolderLastModify].c += 1;
                        }

                        // feature: creation time
                        if (!isNaN(stats.birthtimeMs)) {
                            features[FeatureType.FolderLastModify].m == undefined ? features[FeatureType.FolderLastModify].m = 0 : ""; // init value when undefined
                            features[FeatureType.FolderLastModify].m = features[FeatureType.FolderLastModify].m as number + Math.floor(stats.birthtimeMs / 1000);
                            features[FeatureType.FolderLastModify].c += 1;
                        }
                    }
                }

                // get average of the file modify time
                if (sendResults && features[FeatureType.FolderLastModify] && features[FeatureType.FolderLastModify].m != undefined) {
                    calculateMedian(features);
                }

                /**
                 * Send the features to the main thread when 20 feature data objects are created, so the UI is
                 * updated reguarly when scanning larger folders.
                 */
                if (sendResults || updateSteps++ % 20 == 0) {
                    let result: FolderFeatureResult = {
                        type: SyncMessageType.folderfeatures,
                        id: msg.id,
                        features: features,
                        path: pathF
                    }
                    ipcRenderer.send(IPCMessageType.FileScanToRender, result);
                }

            }

            function collectFeaturesRec(rootPath: string, pathF: string, depth: number = 0, features: FolderNodeFeatures): void {

                let files: Dirent[] = fs.readdirSync(pathF, { withFileTypes: true });

                let depthChildren = depth + 1;

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const absolutePath = pathF + "/" + file.name;
                    if (file.isDirectory() && msg.depth < 100) {
                        collectFeaturesRec(rootPath, absolutePath, depthChildren, features)
                    }
                }

                handleDirectory(pathF, files, features, false);

            }

            /**
             * Scan Meta Data for Feature Creation
             */
            for (let i = 0; i < listFoldersToSyncComplete.length; i++) {
                const element = listFoldersToSyncComplete[i];
                const pathF = element.path;

                let features: FolderNodeFeatures = {
                    [FeatureType.FolderLastModify]: new FeatureDataMedian(),
                    [FeatureType.FolderSize]: new FeatureDataSum(),
                    [FeatureType.FolderQuantity]: new FeatureDataSum(),
                    [FeatureType.FolderFileTypes]: new FeatureDataList()
                };

                if (element.collection) {
                    /**
                     * Collect data from the folder and all subfolders
                     */
                    collectFeaturesRec(pathF, pathF, 0, features);

                    calculateMedian(features);

                    let result: FolderFeatureResult = {
                        type: SyncMessageType.folderfeatures,
                        id: msg.id,
                        features: features,
                        path: pathF
                    }

                    ipcRenderer.send(IPCMessageType.FileScanToRender, result);
                } else {
                    /**
                     * Collect data from the folder 
                     */
                    let files: Dirent[] = fs.readdirSync(pathF, { withFileTypes: true });

                    handleDirectory(pathF, files, features, true);
                }

            }

            ipcRenderer.send(IPCMessageType.FileScanToRender, {
                type: SyncMessageType.folderdeepsyncfinished,
                id: msg.id,
                path: msg.path
            });

            console.log("finished Feature Creation");

        }
    }
);
