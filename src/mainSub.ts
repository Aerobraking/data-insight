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


            let msg: FolderSync = payload;

            let count = 0;

            console.log("Start folder sync");

            function countFolders(pathF: string, depth: number = 0): void {

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

                count += folders.length;

                let depthChildren = depth + 1;
                for (let i = 0; i < folders.length; i++) {
                    const f = folders[i];
                    countFolders(f, depthChildren);
                }

            }

            countFolders(msg.path)

            console.log("foldercount: " + count);


            function scanFolders(pathF: string, depth: number = 0): void {

                let files: string[] = fs.readdirSync(pathF);
                let folders: string[] = [];

                let folderCount = 0;
                for (let i = 0; i < files.length; i++) {
                    const fileName = files[i];
                    const absolutePath = pathF + "/" + fileName;
                    const stats = fs.statSync(absolutePath);
                    if (stats.isDirectory() && fileName != "." && msg.depth < 100 && (msg.depth == 0 || depth < msg.depth)) {
                        folderCount++;
                    }
                }

                if (folderCount < 50) {
                    for (let i = 0; i < files.length; i++) {
                        const fileName = files[i];
                        const absolutePath = pathF + "/" + fileName;
                        const stats = fs.statSync(absolutePath);
                        if (stats.isDirectory() && fileName != "." && msg.depth < 100 && (msg.depth == 0 || depth < msg.depth)) {
                            folders.push(absolutePath);
                        }
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

            console.log("Scan finished");
            console.log("Start stats creation");

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
                        amount: { value: 0, type: StatsType.SUM },
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
                folderStat.stats.amount.value = fileCount;

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

            console.log("finished stats creation");


        }
    }
);
