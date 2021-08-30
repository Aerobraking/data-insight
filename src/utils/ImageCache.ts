export function isImageTypeSupported(path: string): boolean {
    return ['.apng', '.png', '.jpg', '.jpeg', '.avif', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.tif'].some(char => path.toLowerCase().endsWith(char));
}


export interface ImageListener {
    callback: (url: string, type: "small" | "medium" | "original") => void;
    callbackSize: (dim: ImageDim) => void
}

export interface ImageDim {
    width: number;
    height: number;
    ratio: number;
}

const os = require('os')
const cpuCount = os.cpus().length


export class Cache {

    private hashDim: Map<string, ImageDim> = new Map();
    private hash: Map<string, Map<string, string>> = new Map();
    private hashCallbacks: Map<string, ImageListener[]> = new Map();
    private static _instance = new Cache();
    worker = new Worker("@/utils/worker", {
        type: "module",
    });
    private listWorkerTraverser: number = 0;

    private listWorker: Worker[] = [];

    private constructor() {
 
        // cpuCount
        for (let index = 0; index < 3; index++) {
            let w = new Worker("@/utils/worker", {
                type: "module",
            });
            w.onmessage = (e: any) => {
                // Grab the message data from the event


                if (e.data.type == "size") {

                    this.hashDim.set(e.data.path, { width: e.data.width, height: e.data.height, ratio: e.data.ratio });

                    this.doCallback(e.data.path, (l: ImageListener) => {
                        l.callbackSize({ width: e.data.width, height: e.data.height, ratio: e.data.ratio });
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

        /**
         * init webworker
         */
        this.worker.onmessage = (e: any) => {
            // Grab the message data from the event


            if (e.data.type == "size") {

                this.hashDim.set(e.data.path, { width: e.data.width, height: e.data.height, ratio: e.data.ratio });

                this.doCallback(e.data.path, (l: ImageListener) => {
                    l.callbackSize({ width: e.data.width, height: e.data.height, ratio: e.data.ratio });
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
    }

    static get instance() {
        return this._instance;
    }

    getUrl(path: string, type: "small" | "medium" | "original"): string | undefined {
        let imageEntry: Map<string, string> | undefined = this.hash.get("path");
        if (imageEntry == undefined) {
            return undefined;
        } else {
            let url: string | undefined = imageEntry.get(type);
            return path != undefined ? "url('" + url + "')" : undefined;
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



    registerPath(path: string, callback: ImageListener
    ): void {

        let imageEntry: Map<String, String> | undefined = this.hash.get(path);

        if (imageEntry == undefined) {
            /**
             * Start webworker
             */
            this.hash.set(path, new Map());


            this.listWorker[this.listWorkerTraverser].postMessage({ msg: "create", path: path });
            this.listWorkerTraverser++;
            this.listWorkerTraverser = this.listWorkerTraverser > this.listWorker.length - 1 ? 0 : this.listWorkerTraverser;

            //    this.worker.postMessage({ msg: "create", path: path });
        } else {

            let dim = this.hashDim.get(path);
            if (dim) {
                callback.callbackSize(dim);
            }

            let imageEntry: Map<string, string> | undefined = this.hash.get(path);
            if (imageEntry == undefined) {
                return undefined;
            } else {
                let url: string | undefined = imageEntry.get("small");
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
            listCallbacks.push(callback);
            this.hashCallbacks.set(path, listCallbacks);
        }

    }


}

export const ImageCache = Cache.instance;
