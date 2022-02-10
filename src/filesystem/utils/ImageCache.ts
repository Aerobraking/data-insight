import { doBenchmark, start } from "@/core/utils/Benchmark";
import { IframeParenthesesOutline } from "mdue";
import _ from "underscore";

export enum ImageSize {
    preview = "preview",
    tiny = "tiny",
    small = "small",
    medium = "medium",
    original = "original",
    finish = "finish",
    error = "error",
    size = "size"
}

export function isImageTypeSupported(path: string): boolean {
    return ['.apng', '.png', '.jpg', '.jpeg', '.avif', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.tif'].some(char => path.toLowerCase().endsWith(char));
}

export interface ImageListener {
    callback: (url: string, type: ImageSize) => void;
    callbackSize: (dim: ImageDim) => void
}

export interface ImageDim {
    width: number;
    height: number;
    ratio: number;
}

// import os from "os";
// const cpuCount = os.cpus().length 
import { remove } from "../../core/utils/ListUtils";
export class Cache {

    private hashDim: Map<string, ImageDim> = new Map();
    private hash: Map<string, Map<ImageSize, string>> = new Map();
    private hashCallbacks: Map<string, ImageListener[]> = new Map();
    private static _instance = new Cache();

    private listWorkerTraverser: number = 0;

    private listWorker: Worker[] = [];

    public reset() {

        this.hash.forEach((value: Map<ImageSize, string>, key: string) => {
            value.forEach((value: string, key: ImageSize) => {
                URL.revokeObjectURL(value);
            });
        });

        this.hash.clear();
        this.hashCallbacks.clear();
        this.hashDim.clear();
    }

    private constructor() {
        const _this = this;
        // cpuCount
        for (let index = 0; index < 3; index++) {
            let w = new Worker("@/filesystem/utils/ImageCacheWorker", {
                type: "module",
            });
            w.onmessage = (e: any) => {
                // Grab the message data from the event

                if (e.data.type == ImageSize.finish || e.data.type == ImageSize.error) {
                    remove(this.listQueue, e.data.path);

                    if (doBenchmark && this.listQueue.length == 0) console.log("Time for Image loading: ", start("images", "loading images: "));

                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callback("", e.data.type);
                    });
                    return;
                }

                if (e.data.type == ImageSize.size) {
                    this.hashDim.set(e.data.path, { width: e.data.width, height: e.data.height, ratio: e.data.ratio });
                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callbackSize({ width: e.data.width, height: e.data.height, ratio: e.data.ratio });
                    });
                }

                if (e.data.type == ImageSize.preview) {
                    var reader = new FileReader();
                    reader.readAsDataURL(e.data.blob);
                    reader.onloadend = function () {
                        var base64data = reader.result;
                        _this.doCallback(e.data.path, (l: ImageListener) => {
                            l.callback(base64data as string, ImageSize.preview);
                        });

                        setTimeout(() => {
                            _this.listWorker[e.data.index].postMessage({ msg: "create", path: e.data.path, type: "step1" });
                        }, _this.listQueue.length > 10 ? 1450 : 100);
                    }

                }

                if (e.data.type == ImageSize.preview) {
                    const smallURl = URL.createObjectURL(e.data.blob);
                    let imageEntry: Map<ImageSize, String> | undefined = this.hash.get(e.data.path);
                    imageEntry?.set(ImageSize.tiny, smallURl);
                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callback("url('" + smallURl + "')", ImageSize.tiny);
                    });
                }

                if (e.data.type == ImageSize.small) {
                    const smallURl = URL.createObjectURL(e.data.blob);
                    let imageEntry: Map<ImageSize, String> | undefined = this.hash.get(e.data.path);
                    imageEntry?.set(e.data.type, smallURl);
                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callback("url('" + smallURl + "')", e.data.type);
                    });
                }

                if (e.data.type == ImageSize.medium) {
                    const mediumURL = URL.createObjectURL(e.data.blob);
                    let imageEntry: Map<ImageSize, String> | undefined = this.hash.get(e.data.path);
                    imageEntry?.set(ImageSize.medium, mediumURL);
                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callback("url('" + mediumURL + "')", e.data.type);
                        // l.callback( mediumURL , e.data.type);
                    });
                }

                if (e.data.type == ImageSize.original) {
                    const origURL = URL.createObjectURL(e.data.blob);
                    let imageEntry: Map<ImageSize, String> | undefined = this.hash.get(e.data.path);
                    imageEntry?.set(ImageSize.original, origURL);
                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callback("url('" + origURL + "')", e.data.type);
                        // l.callback(origURL, e.data.type);
                    });
                }

            };
            this.listWorker.push(w);
        }

    }

    static get instance() {
        return this._instance;
    }

    getUrl(path: string, type: ImageSize): string | undefined {
        let imageEntry: Map<ImageSize, string> | undefined = this.hash.get(path);
        if (imageEntry == undefined) {
            return undefined;
        } else {
            let url: string | undefined = imageEntry.get(type);
            return url != undefined ? "url('" + url + "')" : undefined;
        }
    }

    getUrlRaw(path: string, type: ImageSize): string | undefined {
        let imageEntry: Map<ImageSize, string> | undefined = this.hash.get(path);
        if (imageEntry == undefined) {
            return undefined;
        } else {
            let url: string | undefined
            switch (type) {
                case ImageSize.original:
                    url = imageEntry.get(type);
                    if (url) break;
                case ImageSize.medium:
                    url = imageEntry.get(type);
                    if (url) break;
                case ImageSize.small:
                    url = imageEntry.get(type);
                    if (url) break;
                case ImageSize.tiny:
                    url = imageEntry.get(type);
                    if (url) break;
                default:
                    break;
            }
            return url != undefined ? url : undefined;
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

    createPreview(p: string) {

        if (doBenchmark && this.listQueue.length == 0)  start("images");
        this.hash.set(p, new Map());
        this.listQueue.push(p);
        this.timeNow = performance.now();
        const diff = this.timeNow - this.timeLast;
        this.timeStack += Cache.delay;
        // setTimeout(() => { 
        this.listWorker[this.listWorkerTraverser].postMessage({ msg: "create", path: p, type: "step0", index: this.listWorkerTraverser });

        this.listWorkerTraverser++;
        this.listWorkerTraverser = this.listWorkerTraverser > this.listWorker.length - 1 ? 0 : this.listWorkerTraverser;
        //}, Math.max(1, this.timeStack));
    };


    timeForSinc: number = 0; 
    private timeLast = performance.now();
    private timeNow = performance.now();
    private listQueue: string[] = [];
    private static delay = 33;
    private timeStack = 0;

    public registerPath = (path: string, callback: ImageListener, recreate: boolean = false, eventsToFire: ImageSize[] = Object.values(ImageSize) as ImageSize[]) => {

        let imageEntry: Map<ImageSize, String> | undefined = this.hash.get(path);


        if (imageEntry == undefined || recreate) {
            /**
             * Start webworker
             */
            this.createPreview(path);

        } else {

            //  wenn es schon existiert angeben was gefeuert werden soll beim registrieren

            let dim = this.hashDim.get(path);
            if (dim && eventsToFire.includes(ImageSize.size)) {
                callback.callbackSize(dim);
            }

            let imageEntry: Map<ImageSize, string> | undefined = this.hash.get(path);
            if (imageEntry == undefined) {
                return undefined;
            } else {
                let url: string | undefined = imageEntry.get(ImageSize.tiny);
                if (url && eventsToFire.includes(ImageSize.tiny)) {
                    callback.callback("url('" + url + "')", ImageSize.tiny);
                }
                url = imageEntry.get(ImageSize.small);
                if (url && eventsToFire.includes(ImageSize.small)) {
                    callback.callback("url('" + url + "')", ImageSize.small);
                }
                url = imageEntry.get(ImageSize.medium);
                if (url && eventsToFire.includes(ImageSize.medium)) {
                    callback.callback("url('" + url + "')", ImageSize.medium);
                }
                url = imageEntry.get(ImageSize.original);
                if (url && eventsToFire.includes(ImageSize.original)) {
                    callback.callback("url('" + url + "')", ImageSize.original);
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

