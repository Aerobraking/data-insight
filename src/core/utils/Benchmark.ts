
const mapTimes: Map<string, { time: number, steps: number, count: number }> = new Map();

export const doBenchmark = true;

export function start(key: string, text: string | undefined = undefined, scale: "s" | "ms" = "s", steps: number = 0) {
    if (!mapTimes.has(key)) { mapTimes.set(key, { time: performance.now(), steps: steps ? steps : 0, count: 0 }); } else {
        if (!text) { const n = mapTimes.get(key); if (n) n.time = performance.now() } // only update when its a start call
        if (text) { const n = mapTimes.get(key); if (n) n.steps = steps }
    }
    if (text) stop(key, text, scale);
}

export function stop(key: string, text: string, scale: "s" | "ms" = "s") {
    const n = mapTimes.get(key);
    if (n && (n.steps == 0 || n.count++ % n.steps == 0)) {
        switch (scale) {
            case "s":
                console.log(text, (((performance.now() - n.time) / 1000) / Math.max(1, n.steps)).toFixed(4), "sec");
                break;
            case "ms":
                console.log(text, (((performance.now() - n.time)) / Math.max(1, n.steps)).toFixed(2), "ms");
                break;
        }
    } else {
        // console.error("No start time set for: " + key);
    }
}