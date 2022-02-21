var os = require('os');
var osu = require('node-os-utils')
var cpu = osu.cpu

interface entry {
    time: number,
    index: number,
    /**
     * 0: set current time
     * 1: calculate time since last call
     * 2: take the time value in this object directly
     */
    isMeasured: 0 | 1 | 2 | 3, fpsStep: number, fpsMean: number[]
}

const mapTimes: Map<string, entry> = new Map();

export const doBenchmark = true;

let keysUsedInTick: string[] = [];
let log: string[] = [];
let indexCounter = 0;
let lastFrameTime = 0;
let lastFrame = 0;

export function tickStart() {

    const t = performance.now();
    lastFrame = (t - lastFrameTime);
    lastFrameTime = t;


    logTime("chrome");

    mapTimes.forEach((value: entry, key: string) => {
        value.isMeasured = 0;
    });

    // set to 2 so it get printed
    const n = mapTimes.get("chrome"); if (n) n.isMeasured = 2;

    keysUsedInTick = [];
    keysUsedInTick.push("chrome");
}

export function logTime(key: string, log: boolean = false, scale: "s" | "ms" = "s") {
    if (!keysUsedInTick.includes(key)) keysUsedInTick.push(key);

    if (!mapTimes.has(key)) { mapTimes.set(key, { index: indexCounter++, time: performance.now(), isMeasured: 0, fpsStep: 0, fpsMean: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }); } else {
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
        const time = entry.isMeasured >= 2 ? entry.time : (performance.now() - entry.time);
        entry.fpsMean[(entry.fpsStep++) % entry.fpsMean.length] = time;
        columns.push(time.toFixed(2));
        columns.push(key + (entry.isMeasured != 3 ? " (ms)" : ""));
    }

}

export function tickEnd(print: boolean = false) {

    logTime("Frame");
    let f = mapTimes.get("Frame"); if (f) f.isMeasured = 2, f.time = lastFrame;

    logTime("CPU (%)"); f = mapTimes.get("CPU (%)"); if (f) f.isMeasured = 3, f.time = cpuUsage;
    logTime("heap (MB)"); f = mapTimes.get("heap (MB)"); if (f) f.isMeasured = 3, f.time = (process.memoryUsage().heapUsed / 1024 / 1024);
    logTime("total (MB)"); f = mapTimes.get("total (MB)"); if (f) f.isMeasured = 3, f.time = (process.memoryUsage().rss / 1024 / 1024);

    const c = mapTimes.get("Frame");
    if (c) {
        const MEAN = (t: number, f: number) => t += f;
        const meanFPS = c.fpsMean.reduce(MEAN, 0) / c.fpsMean.length;
        logTime("~fps"); f = mapTimes.get("~fps"); if (f) f.isMeasured = 3, f.time = Math.round(1000 / meanFPS);
        logTime("fps"); f = mapTimes.get("fps"); if (f) f.isMeasured = 3, f.time = Math.round(1000 / c.time);
    }

    let newLine: string[] = new Array(indexCounter).fill(" ");
    let header: string[] = new Array(indexCounter).fill(" ");

    keysUsedInTick.forEach(key => {
        const e = mapTimes.get(key);
        if (e) {
            header[e.index] = key + (e.isMeasured != 3 ? " (ms)" : "");
            const time = e.isMeasured >= 2 ? e.time : (performance.now() - e.time);
            e.fpsMean[(e.fpsStep++) % e.fpsMean.length] = time;
            newLine[e.index] = time.toFixed(2);
        }
    });
  
    cpu.usage().then((v: number) => cpuUsage = v);

    newLine.push("\n");
    log.push(...newLine); 

    if (print) {
        console.log(keysUsedInTick);
        console.log(header);
        console.log(newLine);
        console.log(mapTimes);
        
        header.unshift("\n"); 
        header.push("\n"); 
        log = [...header , ...log]; 
        log.forEach((s, i) => log[i] = s.replace(".", ","));
        console.log(log.join(";"));
        log = [];
    }

    const n = mapTimes.get("chrome"); if (n) n.isMeasured = 0; logTime("chrome");
}

let cpuUsage = 0;

