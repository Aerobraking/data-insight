import _ from "underscore";
import * as watcher from "./WatchSystem";

export function isImageTypeSupported(path: string): boolean {
    return ['.apng', '.png', '.jpg', '.jpeg', '.avif', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.tif'].some(char => path.toLowerCase().endsWith(char));
}

export interface ImageListener {
    callback: (url: string, type: "preview" | "tiny" | "small" | "medium" | "original") => void;
    callbackSize: (dim: ImageDim) => void
}

export interface ImageDim {
    width: number;
    height: number;
    ratio: number;
}

// import os from "os";
// const cpuCount = os.cpus().length
import fs from "fs";
import { remove } from "./ListUtils";
export class Cache {

    private hashDim: Map<string, ImageDim> = new Map();
    private hash: Map<string, Map<string, string>> = new Map();
    private hashCallbacks: Map<string, ImageListener[]> = new Map();
    private static _instance = new Cache();

    private listWorkerTraverser: number = 0;

    private listWorker: Worker[] = [];

    private constructor() {
        const _this = this;
        // cpuCount
        for (let index = 0; index < 3; index++) {
            let w = new Worker("@/utils/ImageCacheWorker", {
                type: "module",
            });
            w.onmessage = (e: any) => {
                // Grab the message data from the event

                if (e.data.type == "finish" || e.data.type == "error") { 
                    remove(this.listQueue, e.data.path);
                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callback("", e.data.type); 
                    });
                    return;
                }

                if (e.data.type == "size") {
                    this.hashDim.set(e.data.path, { width: e.data.width, height: e.data.height, ratio: e.data.ratio });
                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callbackSize({ width: e.data.width, height: e.data.height, ratio: e.data.ratio });
                    });
                }

                if (e.data.type == "preview") {
                    var reader = new FileReader();
                    reader.readAsDataURL(e.data.blob);
                    reader.onloadend = function () {
                        var base64data = reader.result;
                        _this.doCallback(e.data.path, (l: ImageListener) => {
                            l.callback(base64data as string, "preview");
                        });
                    }
                }

                if (e.data.type == "preview") {
                    const smallURl = URL.createObjectURL(e.data.blob);
                    let imageEntry: Map<String, String> | undefined = this.hash.get(e.data.path);
                    imageEntry?.set("tiny", smallURl);
                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callback("url('" + smallURl + "')", "tiny");
                    });
                }

                if (e.data.type == "small") {
                    const smallURl = URL.createObjectURL(e.data.blob);
                    let imageEntry: Map<String, String> | undefined = this.hash.get(e.data.path);
                    imageEntry?.set(e.data.type, smallURl);
                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callback("url('" + smallURl + "')", e.data.type);
                    });
                }

                if (e.data.type == "medium") {
                    const mediuamURl = URL.createObjectURL(e.data.blob);

                    let imageEntry: Map<String, String> | undefined = this.hash.get(e.data.path);
                    imageEntry?.set("medium", mediuamURl);


                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callback("url('" + mediuamURl + "')", e.data.type);
                    });
                }

            };
            this.listWorker.push(w);
        }
 
    }

    static get instance() {
        return this._instance;
    }

    getUrl(path: string, type: "tiny" | "small" | "medium" | "original"): string | undefined {
        let imageEntry: Map<string, string> | undefined = this.hash.get(path);
        if (imageEntry == undefined) {
            return undefined;
        } else {
            let url: string | undefined = imageEntry.get(type);
            return path != undefined ? "url('" + url + "')" : undefined;
        }
    }
    getUrlRaw(path: string, type: "tiny" | "small" | "medium" | "original"): string | undefined {
        let imageEntry: Map<string, string> | undefined = this.hash.get(path);
        if (imageEntry == undefined) {
            return undefined;
        } else {
            let url: string | undefined = imageEntry.get(type);
            return path != undefined ? url : undefined;
        }
    }

    private doCallback(path: string, call:
        (l: ImageListener) => void) {
        let listCallbacks: ImageListener[] | undefined = this.hashCallbacks.get(path);

        if (listCallbacks != undefined) {
            for (let index = 0; index < listCallbacks.length; index++) {
                const c = listCallbacks[index];
                call(c);
            }
        }
    }

    private timeLast = performance.now();
    private timeNow = performance.now();
    private listQueue: string[] = [];
    private static delay = 33;
    private timeStack = 0;
    public registerPath = (path: string, callback: ImageListener, recreate: boolean = false) => {

        let imageEntry: Map<String, String> | undefined = this.hash.get(path);

        const createPreview = (p: string) => {
            this.hash.set(p, new Map());
            this.listQueue.push(path);
            this.timeNow = performance.now();
            const diff = this.timeNow - this.timeLast;
            this.timeStack += Cache.delay;
            // setTimeout(() => {
            this.listWorker[this.listWorkerTraverser].postMessage({ msg: "create", path: p });
            this.listWorkerTraverser++;
            this.listWorkerTraverser = this.listWorkerTraverser > this.listWorker.length - 1 ? 0 : this.listWorkerTraverser;
            //}, Math.max(1, this.timeStack));
        };

        if (imageEntry == undefined || recreate) {
            /**
             * Start webworker
             */
            createPreview(path);
            // try {
            //     fs.accessSync(path, fs.constants.R_OK);
            //     createPreview(path);
            // } catch (error) {

            //     watcher.FileSystemWatcher.registerPath(path, () => {
            //         createPreview(path);
            //     })

            // }

        } else {

            let dim = this.hashDim.get(path);
            if (dim) {
                callback.callbackSize(dim);
            }

            let imageEntry: Map<string, string> | undefined = this.hash.get(path);
            if (imageEntry == undefined) {
                return undefined;
            } else {
                let url: string | undefined = imageEntry.get("tiny");
                if (url) {
                    callback.callback("url('" + url + "')", "tiny");
                }
                url = imageEntry.get("small");
                if (url) {
                    callback.callback("url('" + url + "')", "small");
                }
                let urlM: string | undefined = imageEntry.get("medium");
                if (urlM) {
                    callback.callback("url('" + urlM + "')", "medium");
                }

            }

        }

        let listCallbacks: ImageListener[] | undefined = this.hashCallbacks.get(path);

        if (listCallbacks == undefined) {
            listCallbacks = [];
            this.hashCallbacks.set(path, listCallbacks);
        }

        if (!listCallbacks.includes(callback)) listCallbacks.push(callback);

        this.timeStack -= Cache.delay;
        this.timeLast = performance.now();
    };

}

export const ImageCache = Cache.instance;

