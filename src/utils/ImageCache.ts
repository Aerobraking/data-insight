export function isImageTypeSupported(path:string):boolean{
    return ['.apng','.png','.jpg','.jpeg','.avif','.gif','.svg','.webp','.bmp','.tiff','.tif'].some(char => path.toLowerCase().endsWith(char));
}
 

export class Cache {

    private hash: Map<string, Map<string, string>> = new Map();
    private hashCallbacks: Map<string, { (url: string, type: "small" | "medium" | "original"): void; }[]> = new Map();
    private static _instance = new Cache();

    private constructor() {
        /**
         * init webworker
         */


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

    private createWorker(path: string) {
        const worker = new Worker("@/utils/worker", {
            type: "module",
        });


        worker.postMessage({ msg: "init" });
        worker.postMessage({ msg: "create", path: path });
        worker.onmessage = (e: any) => {
            // Grab the message data from the event


            if (e.data.type == "small") {
                const smallURl = URL.createObjectURL(e.data.blob);

                let imageEntry: Map<String, String> | undefined = this.hash.get(e.data.path);
                imageEntry?.set(e.data.type, smallURl);

                this.doCallback(e.data.path, smallURl, e.data.type);
            }

            if (e.data.type == "medium") {
                const mediuamURl = URL.createObjectURL(e.data.blob);

                let imageEntry: Map<String, String> | undefined = this.hash.get(e.data.path);
                imageEntry?.set("medium", mediuamURl);

                this.doCallback(e.data.path, mediuamURl, e.data.type);


            }



        };
    }

    private doCallback(path: string, url: string, type: "small" | "medium" | "original") {
        let listCallbacks: { (url: string, type: "small" | "medium" | "original"): void }[] | undefined = this.hashCallbacks.get(path);

        if (listCallbacks != undefined) {
            for (let index = 0; index < listCallbacks.length; index++) {
                const c = listCallbacks[index];
                c("url('" + url + "')", type);
            }
        }
    }

    registerPath(path: string, callback: (url: string, type: "small" | "medium" | "original") => void): void {


        let imageEntry: Map<String, String> | undefined = this.hash.get(path);


        if (imageEntry == undefined) {
            /**
             * Start webworker
             */
            this.hash.set(path, new Map());
            this.createWorker(path);
        } else {
          
            let imageEntry: Map<string, string> | undefined = this.hash.get(path);
            if (imageEntry == undefined) {
                return undefined;
            } else {
                let url: string | undefined = imageEntry.get("small");
                if (url) {
                    callback("url('" + url + "')", "small");
                }
                let urlM: string | undefined = imageEntry.get("medium");
                if (urlM) {
                    callback("url('" + urlM + "')", "medium");
                }

            }

        }

        let listCallbacks: { (url: string, type: "small" | "medium" | "original"): void }[] | undefined = this.hashCallbacks.get(path);

        if (listCallbacks == undefined) {
            listCallbacks = [];
            listCallbacks.push(callback);
            this.hashCallbacks.set(path, listCallbacks);
        }

    }


}

export const ImageCache = Cache.instance;

