'use strict'
import 'reflect-metadata';

import fs from "fs";
// var fs = require("fs")
import { ipcRenderer } from "electron"; 
import { FolderSync, FolderStat, FolderSyncResult, StatsType, FolderStatsResult } from './components/workspace/overview/OverviewInterfaces';
export function startListener() {


    console.log("register ipc in worker");

    /**
     * We scan the complete folder and send back first the folder structure and then the stats for each folder based on their files
     */
    ipcRenderer.on(
        "msg-main",
        function (event: any, payload: any) {

            console.log("worker got message from main: ");

            console.log(payload);


            if (payload.type === "folderdeepsync") {

                console.log("starte syncing");

                let scanFinishd = false;

                let msg: FolderSync = payload;

                function visitFolder(pathF: string, depth: number = 0): FolderStat {

                    let sync: FolderSyncResult = { id: msg.id, path: pathF, type: "foldersync" };
                    // @ts-ignore: Unreachable code error
                    ipcRenderer.send('msg-worker', sync);
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

}



/**
 * Wir bekommen einen Ordner für die Overview.
 * Für diesen laden wir erstmal alle Ordner in unsere Datenstruktur
 * Wenn das fertig ist, schicken wir alle ordner zu unserem Webworker als liste.
 * Dieser arbeitet die liste ab, wobei nach jedem Ordner nen kurzes timout kommt.
 *
 * WICHTIG
 * Wir müssen von den tiefsten Ordnern nach oben arbeiten.
 * Die einfachste möglichkeit wäre es die liste zu sortieren anhand der anzahl von / zeichen.
 * Cooler wäre es, wenn wir jeden einzelnen Ast von unten nach oben gehen könnten, dazu
 * kann man sich noch was überlegen. (vielleicht nur den hauptordner schicken und dann von unten nach oben durchqrawlen?)
 *
 * Ideen:
 * 1. Variante: nur der genannte Ordner wird gesynct
 * 2. Variante: Der ordner mit allen unterordnen (oder bestimmer detph) wird gesynct. Das beim hinzufügen meist der fall und könnte auch nützlich sein beim syncen beim öffnen eines existierenden workspaces
 *
 *
 * Ne node braucht ne flag ob synchronisiert wird oder nicht. damit wir ne passende animation zeigen können.
 *
 * Bei jedem ordner analysieren wie die Dateien und schicken alle gesammelten stats als message zurück. Die Overview entries empfangen diese nachricht und leiten sie in die entsprechende Node weiter.
 * Daraufhin muss der Entry die stats bei allen parents neu kalkulieren.
 * Dafür müssen wir zum parent gehen, den Median aller direkten children berechnen, und diesen schritt n mal wiederholen.
 *
 *
 *
 * Wenn die gesamte Syncro fertig ist, erstellen wir einen Listener für den Ordner, die auf Änderungen aufpasst. Dabei sammeln wir events für ~200ms und schicken sie dann gesammelt an den webworker. so können wir z.b. beim löschen von mehreren dateien diese zusammenfassen und nur einmal nen update zurück schicken.
 * - Beim löschen eines ordners ist klar was passieren muss: Node löschen und stats aktualisieren
 * - Beim löschen, hinzufügen oder ändern von Dateien ebenso, nur dass die Node nicht gelöscht wird.
 * - Hinzufügen von Ordnern machen wir ja schon, da müssen dann nur die stats angestoßen werden.
 *
 *
 *
 * Stats:
 * Da wäre wohl ne map ganz gut. Und zwar einmal die werte für die Node selbst und die rekursiv berechneten Werte
 *
 *
 * [size]=10
 * [amountFiles]=10
 * [Age]=101653384 (timestamp)
 * [Changes]=210
 *
 * Rekursiv
 * [size]=1015                  (addieren)
 * [amountFiles]=1054           (addieren)
 * [amountFolders]=10478        (addieren)
 * [Age]=101653384 (timestamp)  (querschnitt)
 * [Changes]=210                (macht beides sinn?)
 */