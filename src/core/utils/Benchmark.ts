
const mapTimes: Map<string, number> = new Map();

export const doBenchmark = true;

export function start(key: string,text:string|undefined=undefined) {
    mapTimes.set(key, performance.now());
    if(text) stop(key,text);
}

export function stop(key: string, text: string) {
    const n = mapTimes.get(key);
    if (n) {
        console.log(text, (performance.now() - n) / 1000, "seconds");
    } else {
        console.error("No start time set for: " + key);
    }
}