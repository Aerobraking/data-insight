
import 'reflect-metadata';
import fs from 'fs';
import { ipcRenderer } from "electron";
import { FolderSync, FolderSyncResult, FolderSyncFinished, FolderFeatureResult } from './filesystem/utils/FileSystemMessages';
import { Feature, FeatureDataList, FeatureDataSum, NodeFeatures, FolderNodeFeatures, FeatureDataMedian } from './core/model/overview/AbstractNodeFeature';
import path from "path";
import { Dirent } from 'fs-extra';

ipcRenderer.on("log", (event, log) => {
    //  console.log("log", log);
});

/**
 * We scan the complete folder and send back first the folder structure and then the stats for each folder based on their files
 */
ipcRenderer.on("msg-main",
    function (event: any, payload: any) {

        let sizeAll = 0;

        if (payload.type === "folderdeepsync") {

            let msg: FolderSync = payload;

            let count = 0;
            // msg.depth
            const maxDepth = msg.depth;

            console.log("Start folder sync");

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

                    count += folders.length;

                    const depthChildren = depth + 1;

                    const isCollection: boolean = (folders.length >= msg.collectionSize && depthChildren > 1) || depthChildren > maxDepth || depthChildren > 100;

                    const e: any = { id: msg.id, childCount: folders.length, path: pathCurrent, type: "foldersync", collection: isCollection };
                    listFoldersToSync.push(e);
                    listFoldersToSyncComplete.push(e);


                    if (listFoldersToSync.length > 5) {
                        listFoldersToSync.forEach(e => ipcRenderer.send('msg-worker', e))
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

            listFoldersToSync.forEach(e => ipcRenderer.send('msg-worker', e))

            console.log("Scanned folders, now extract features");
 
            let updateSteps = 0;

            function calculateMedian(features: FolderNodeFeatures) {
                features[Feature.FolderLastModify].m = Math.floor(features[Feature.FolderLastModify].m as number / features[Feature.FolderLastModify].c);
            }

            function handleDirectory(pathF: string, files: Dirent[], features: FolderNodeFeatures, sendResults: boolean = true) {

                let mtimeCount = 0;
                /**
                 * Add the stats from all files together
                 */

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const absolutePath = pathF + "/" + file.name;

                    if (file.isFile()) {

                        const stats = fs.statSync(absolutePath);

                        // size feature
                        if (features[Feature.FolderSize]) features[Feature.FolderSize].s += stats.size;
                        sizeAll += stats.size;

                        // file quantity feature
                        features[Feature.FolderQuantity].s += 1;


                        // file type feature
                        const fileExtention = path.extname(file.name);
                        if (features[Feature.FolderFileTypes].l[fileExtention] == undefined) {
                            features[Feature.FolderFileTypes].l[fileExtention] = 0;
                        }
                        features[Feature.FolderFileTypes].l[fileExtention] += 1;
                        if (!isNaN(stats.mtimeMs)) { // last modify time
                            features[Feature.FolderLastModify].m == undefined ? features[Feature.FolderLastModify].m = 0 : ""; // init value
                            features[Feature.FolderLastModify].m = features[Feature.FolderLastModify].m as number + Math.floor(stats.mtimeMs / 1000);
                            mtimeCount++;
                            features[Feature.FolderLastModify].c += 1;
                        }
                        //  = isNaN(stats.atimeMs) ?       0 : stats.atimeMs;      // last access
                        //  = isNaN(stats.birthtimeMs) ?   0 : stats.birthtimeMs;  // creation time
                    }
                }

                // get average of the file modify time
                if (sendResults && features[Feature.FolderLastModify] && features[Feature.FolderLastModify].m != undefined) {

                    calculateMedian(features);
                }



                if (sendResults || updateSteps++ % 20 == 0) {
                    let result: FolderFeatureResult = {
                        type: "folderfeatures",
                        id: msg.id,
                        features: features,
                        path: pathF
                    }
                    ipcRenderer.send('msg-worker', result);
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
                    [Feature.FolderLastModify]: new FeatureDataMedian(),
                    [Feature.FolderSize]: new FeatureDataSum(),
                    [Feature.FolderQuantity]: new FeatureDataSum(),
                    [Feature.FolderFileTypes]: new FeatureDataList()
                };

                if (element.collection) {
                    /**
                     * Collect data from the folder and all subfolders
                     */

                    collectFeaturesRec(pathF, pathF, 0, features);

                    calculateMedian(features);

                    let result: FolderFeatureResult = {
                        type: "folderfeatures",
                        id: msg.id,
                        features: features,
                        path: pathF
                    }

                    ipcRenderer.send('msg-worker', result);
                } else {
                    /**
                     * Collect data from the folder 
                     */


                    let files: Dirent[] = fs.readdirSync(pathF, { withFileTypes: true });

                    handleDirectory(pathF, files, features, true);

                }

            }

            ipcRenderer.send('msg-worker', {
                type: "folderdeepsyncfinished",
                id: msg.id,
                path: msg.path
            });

            console.log("finished Feature Creation");

        }
    }
);
