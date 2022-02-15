var os = require('os');
var osu = require('node-os-utils')
var cpu = osu.cpu

interface entry {
    time: number, isMeasured: 0 | 1 | 2, fpsStep: number, fpsMean: number[]
}

const mapTimes: Map<string, entry> = new Map();

export const doBenchmark = true;

let keysUsedInTick: string[] = [];
let log: string[] = [];

var startTime: [number, number] | undefined, startUsage: { user: number; system: number; } | undefined;
var elapTime: [number, number], elapUsage: { user: number; system: number; };

function secNSec2ms(secNSec: Array<number> | number) {
    if (Array.isArray(secNSec)) {
        return secNSec[0] * 1000 + secNSec[1] / 1000000;
    }
    return secNSec / 1000;
}

export function tickStart() {
    mapTimes.forEach((value: entry, key: string) => {
        value.isMeasured = 0;
    });

    // if (startTime && startUsage) {
    //     elapTime = process.hrtime(startTime);
    //     elapUsage = process.cpuUsage(startUsage);

    //     var elapTimeMS = secNSec2ms(elapTime);
    //     var elapUserMS = secNSec2ms(elapUsage.user);
    //     var elapSystMS = secNSec2ms(elapUsage.system);
    //     cpuUsage = Math.round(100 * (elapUserMS + elapSystMS) / elapTimeMS);
    //     console.log(cpuUsage);
        
    // }

    // startTime = process.hrtime()
    // startUsage = process.cpuUsage()

    keysUsedInTick = [];
}

export function logTime(key: string, log: boolean = false, scale: "s" | "ms" = "s") {
    if (!keysUsedInTick.includes(key)) keysUsedInTick.push(key);

    if (!mapTimes.has(key)) { mapTimes.set(key, { time: performance.now(), isMeasured: 0, fpsStep: 0, fpsMean: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }); } else {
        const n = mapTimes.get(key);
        if (n) {
            if (n.isMeasured == 0) { n.time = performance.now(); n.isMeasured = 1; }
            else { n.time = (performance.now() - n.time); n.isMeasured = 2; } // att the second call we save the time
        }
    }
    if (log) print(key, scale, log);
}

function print(key: string, scale: "s" | "ms" = "s", log: boolean = false) {
    const n = mapTimes.get(key);
    if (n) {
        switch (scale) {
            case "s":
                console.log((((performance.now() - n.time) / 1000)).toFixed(4), "sec");
                break;
            case "ms":
                const columns: string[] = [];
                addPrintText(columns, key);
                if (log) console.log(...columns);
                break;
        }
    }
}

function addPrintText(columns: string[], key: string) {
    const entry = mapTimes.get(key);
    if (entry) {
        const time = entry.isMeasured == 2 ? entry.time : (performance.now() - entry.time);
        entry.fpsMean[(entry.fpsStep++) % entry.fpsMean.length] = time;
        const MEAN = (t: number, f: number) => t += f;
        const meanFPS = entry.fpsMean.reduce(MEAN, 0) / entry.fpsMean.length;
        columns.push(key);
        columns.push(time.toFixed(2));
        columns.push("ms");
        if (entry.isMeasured != 2) {
            columns.push(Math.round(1000 / meanFPS) + "");
            columns.push("~fps");
            columns.push(Math.round(1000 / time) + "");
            columns.push("fps");
        }

    }
}

export function tickEnd(print: boolean = false) {

    keysUsedInTick.forEach(key => { addPrintText(log, key); });

    // cpu.usage()
    //     .then((cpuPercentage: number) => {
    //         // cpuUsage = cpuPercentage;
    //     });

    // log.push(String(cpuUsage));
    // log.push("cpu");
    log.push(String((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)));
    log.push("heap");
    log.push(String((process.memoryUsage().rss / 1024 / 1024).toFixed(2)));
    log.push("total");
    log.push("\n");

    if (print) {
        log.forEach((s, i) => log[i] = s.replace(".", ","));
        console.log(log.join(";"));
    }

}

let cpuUsage = 0;

