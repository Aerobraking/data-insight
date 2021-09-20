import 'reflect-metadata';
import fs from 'fs';
// var fs = require("fs")
import { ipcRenderer } from "electron";
import { FolderSync, FolderStat, FolderSyncResult, StatsType, FolderStatsResult } from './components/workspace/overview/OverviewInterfaces';

/**
 * We scan the complete folder and send back first the folder structure and then the stats for each folder based on their files
 */
ipcRenderer.on("msg-main",
    function (event: any, payload: any) {

        if (payload.type === "folderdeepsync") {

            let scanFinishd = false;

            let msg: FolderSync = payload;

            function scanFolders(pathF: string, depth: number = 0): void {

                let files: string[] = fs.readdirSync(pathF);
                let folders: string[] = [];

                for (let i = 0; i < files.length; i++) {
                    const fileName = files[i];
                    const absolutePath = pathF + "/" + fileName;
                    const stats = fs.statSync(absolutePath);
                    if (stats.isDirectory() && fileName != "." && msg.depth < 100 && (msg.depth == 0 || depth < msg.depth)) {
                        folders.push(absolutePath);
                    }
                }

                let sync: FolderSyncResult = { id: msg.id, childCount: folders.length, path: pathF, type: "foldersync" };
                // @ts-ignore: Unreachable code error
                ipcRenderer.send('msg-worker', sync);

                let depthChildren = depth + 1;
                for (let i = 0; i < folders.length; i++) {
                    const f = folders[i];
                    scanFolders(f, depthChildren);
                }

            }

            scanFolders(msg.path);

            if (!scanFinishd) {
                console.log("Scan finished");
                scanFinishd = true;
            }

            function visitFolder(pathF: string, depth: number = 0): FolderStat {

                // let sync: FolderSyncResult = { id: msg.id, childCount:0,path: pathF, type: "foldersync" };
                // @ts-ignore: Unreachable code error
                // ipcRenderer.send('msg-worker', sync);

                let files: string[] = fs.readdirSync(pathF);

                let depthChildren = depth + 1;

                for (let i = 0; i < files.length; i++) {
                    const fileName = files[i];
                    const absolutePath = pathF + "/" + fileName;
                    const stats = fs.statSync(absolutePath);
                    if (stats.isDirectory() && fileName != "." && msg.depth < 100 && (msg.depth == 0 || depth < msg.depth)) {
                        visitFolder(absolutePath, depthChildren)
                    }
                }

                let folderStat: FolderStat = {
                    path: pathF,
                    stats:
                    {
                        size: { value: 0, type: StatsType.SUM },
                        mtime: { value: 0, type: StatsType.MEDIAN },
                        atime: { value: 0, type: StatsType.MEDIAN },
                        ctime: { value: 0, type: StatsType.MEDIAN },
                    },
                };

                let fileCount = 0;
                for (let i = 0; i < files.length; i++) {
                    const fileName = files[i];
                    const absolutePath = pathF + "/" + fileName;
                    const stats = fs.statSync(absolutePath);
                    if (stats.isFile()) {
                        fileCount++;
                        folderStat.stats.size.value += stats.size;
                        folderStat.stats.mtime.value += isNaN(stats.mtimeMs) ? 0 : stats.mtimeMs; // last modifiy
                        folderStat.stats.atime.value += isNaN(stats.atimeMs) ? 0 : stats.atimeMs; // last access
                        folderStat.stats.ctime.value += isNaN(stats.birthtimeMs) ? 0 : stats.birthtimeMs; // creation time
                    }
                }

                if (fileCount > 0) {
                    folderStat.stats.mtime.value /= fileCount;
                    folderStat.stats.atime.value /= fileCount;
                    folderStat.stats.ctime.value /= fileCount;
                    console.log("scanned: " + fileCount + " files");

                }

                let result: FolderStatsResult = {
                    type: "folderstats",
                    id: msg.id,
                    stats: folderStat,
                    path: pathF
                }

                // @ts-ignore: Unreachable code error
                ipcRenderer.send('msg-worker', result);
                return folderStat;

            }

            visitFolder(msg.path);

            console.log("finished scanning");


        }
    }
);
