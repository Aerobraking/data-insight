
import 'reflect-metadata';
import fs from 'fs';
import { ipcRenderer } from "electron";
import { FolderSync, FolderStat, FolderSyncResult, StatsType, FolderStatsResult, FolderSyncFinished } from './store/model/implementations/filesystem/FileOverviewInterfaces';

ipcRenderer.on("log", (event, log) => {
    // console.log("log", log);
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

            const listFoldersToSync: FolderSyncResult[] = [];

            function countAndScanFolders(pathCurrent: string, depth: number = 0): void {

                let files: string[] = fs.readdirSync(pathCurrent);
                let folders: string[] = [];

                for (let i = 0; i < files.length; i++) {
                    const fileName = files[i];
                    const absolutePath = pathCurrent + "/" + fileName;
                    const stats = fs.statSync(absolutePath);
                    if (stats.isDirectory() && !fileName.includes(".") && msg.depth < 100 && (msg.depth == 0 || depth <= maxDepth)) {
                        folders.push(absolutePath);
                    }
                }

                count += folders.length;

                const depthChildren = depth + 1;

                const isCollection: boolean = folders.length >= msg.collectionSize || depthChildren > maxDepth || depthChildren > 100;

                console.log("folder: "+pathCurrent);
                
                listFoldersToSync.push({ id: msg.id, childCount: folders.length, path: pathCurrent, type: "foldersync", collection: isCollection });


                for (let i = 0; i < folders.length; i++) {
                    const f = folders[i];
                    if (!isCollection) {
                        countAndScanFolders(f, depthChildren);
                    }
                }


            }

            countAndScanFolders(msg.path)

            console.log("foldercount: " + count);

            for (let i = 0; i < listFoldersToSync.length; i++) {
                const element = listFoldersToSync[i];

                // @ts-ignore: Unreachable code error
                ipcRenderer.send('msg-worker', element);
            }

            console.log("Scan finished");
            console.log("Start Feature creation");

            let updateSteps = 0;
            function collectStatsRec(rootPath: string, pathF: string, depth: number = 0, fStats: FolderStat): void {

                let files: string[] = fs.readdirSync(pathF);

                let depthChildren = depth + 1;

                for (let i = 0; i < files.length; i++) {
                    const fileName = files[i];
                    const absolutePath = pathF + "/" + fileName;
                    const stats = fs.statSync(absolutePath);
                    if (stats.isDirectory() && msg.depth < 100) {
                        collectStatsRec(rootPath, absolutePath, depthChildren, fStats)
                    }
                }

                let fileCount = 0;
                for (let i = 0; i < files.length; i++) {
                    const fileName = files[i];
                    const absolutePath = pathF + "/" + fileName;
                    const stats = fs.statSync(absolutePath);
                    if (stats.isFile()) {
                        fileCount++;
                        fStats.stats.size.value += stats.size;
                        sizeAll += stats.size;
                        fStats.stats.mtime.value += isNaN(stats.mtimeMs) ? 0 : stats.mtimeMs; // last modifiy
                        fStats.stats.atime.value += isNaN(stats.atimeMs) ? 0 : stats.atimeMs; // last access
                        fStats.stats.ctime.value += isNaN(stats.birthtimeMs) ? 0 : stats.birthtimeMs; // creation time
                    }
                }

                fStats.stats.amount.value += fileCount;

                if (updateSteps++ % 20 == 0) {
                    let result: FolderStatsResult = {
                        type: "folderstats",
                        id: msg.id,
                        stats: fStats,
                        path: rootPath
                    }

                    ipcRenderer.send('msg-worker', result);
                }


            }


            /**
             * Scan Meta Data
             */
            for (let i = 0; i < listFoldersToSync.length; i++) {
                const element = listFoldersToSync[i];
                const pathF = element.path;

                if (element.collection) {
                    /**
                     * Collect data from the folder and all subfolders
                     */
                    let folderStat: FolderStat = {
                        path: pathF,
                        stats:
                        {
                            amount: { value: 0, type: StatsType.SUM },
                            size: { value: 0, type: StatsType.SUM },
                            mtime: { value: 0, type: StatsType.MEDIAN },
                            atime: { value: 0, type: StatsType.MEDIAN },
                            ctime: { value: 0, type: StatsType.MEDIAN },
                        },
                    };

                    collectStatsRec(pathF, pathF, 0, folderStat);

                    if (folderStat.stats.amount.value > 0) {
                        folderStat.stats.mtime.value /= folderStat.stats.amount.value;
                        folderStat.stats.atime.value /= folderStat.stats.amount.value;
                        folderStat.stats.ctime.value /= folderStat.stats.amount.value;
                    }

                    let result: FolderStatsResult = {
                        type: "folderstats",
                        id: msg.id,
                        stats: folderStat,
                        path: pathF
                    }

                    ipcRenderer.send('msg-worker', result);
                } else {
                    /**
                     * Collect data from the folder 
                     */
                    let files: string[] = fs.readdirSync(pathF);

                    let folderStat: FolderStat = {
                        path: pathF,
                        stats:
                        {
                            amount: { value: 0, type: StatsType.SUM },
                            size: { value: 0, type: StatsType.SUM },
                            mtime: { value: 0, type: StatsType.MEDIAN },
                            atime: { value: 0, type: StatsType.MEDIAN },
                            ctime: { value: 0, type: StatsType.MEDIAN },
                        },
                    };

                    /**
                     * Add the stats from all files together
                     */
                    let fileCount = 0;
                    for (let i = 0; i < files.length; i++) {
                        const fileName = files[i];
                        const absolutePath = pathF + "/" + fileName;
                        const stats = fs.statSync(absolutePath);
                        if (stats.isFile()) {
                            fileCount++;
                            folderStat.stats.size.value += stats.size;
                            sizeAll += stats.size;
                            folderStat.stats.mtime.value += isNaN(stats.mtimeMs) ? 0 : stats.mtimeMs; // last modifiy
                            folderStat.stats.atime.value += isNaN(stats.atimeMs) ? 0 : stats.atimeMs; // last access
                            folderStat.stats.ctime.value += isNaN(stats.birthtimeMs) ? 0 : stats.birthtimeMs; // creation time
                        }
                    }
                    folderStat.stats.amount.value = fileCount;

                    // create the mean values
                    if (fileCount > 0) {
                        folderStat.stats.mtime.value /= fileCount;
                        folderStat.stats.atime.value /= fileCount;
                        folderStat.stats.ctime.value /= fileCount;
                    }

                    /**
                     * bei einem leaf ordner keine collection raus machen
                     * 
                     * muss eigl im abstract node passieren und nicht hier :/
                     */
                    let result: FolderStatsResult = {
                        type: "folderstats",
                        id: msg.id,
                        stats: folderStat,
                        path: pathF
                    }

                    ipcRenderer.send('msg-worker', result);

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