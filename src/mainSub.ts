import 'reflect-metadata';
import fs from 'fs';
// var fs = require("fs")
import { ipcRenderer } from "electron";
import { FolderSync, FolderStat, FolderSyncResult, StatsType, FolderStatsResult } from './components/workspace/overview/OverviewInterfaces';

// import awd from "./components/workspace/overview/FileScanner"
// import { startListener } from "./FileScanner"
// startListener();
console.log("Second created!");
// awd();

console.log("register ipc in worker");

/**
 * We scan the complete folder and send back first the folder structure and then the stats for each folder based on their files
 */
ipcRenderer.on("msg-main",
    function (event: any, payload: any) {

        console.log("worker got message from main: ");

        console.log(payload);


        if (payload.type === "folderdeepsync") {

            console.log("worker got message from main: ");

            let scanFinishd = false;

            let msg: FolderSync = payload;

            function visitFolder(pathF: string, depth: number = 0): FolderStat {

                let sync: FolderSyncResult = { id: msg.id, path: pathF, type: "foldersync" };
                // @ts-ignore: Unreachable code error
                ipcRenderer.send('msg-worker', sync);
                console.log("folder visited: ");
                console.log(sync);

                // postMessage(sync);

                let files: string[] = fs.readdirSync(pathF);

                for (let i = 0; i < files.length; i++) {
                    const fileName = files[i];
                    const absolutePath = pathF + "/" + fileName;
                    const stats = fs.statSync(absolutePath);
                    if (stats.isDirectory() && msg.depth < 100 && (msg.depth == 0 || depth < msg.depth)) {
                        visitFolder(absolutePath, depth++)
                    }
                }

                if (!scanFinishd) {
                    console.log("Scan finished");
                    scanFinishd = true;
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
                }

                let result: FolderStatsResult = {
                    id: msg.id,
                    stats: folderStat,
                    type: "folderstats",
                    path: pathF
                }

                // @ts-ignore: Unreachable code error
                ipcRenderer.send('msg-worker', result);
                // postMessage(result);

                return folderStat;

            }


            visitFolder(msg.path);

        }
    }
);