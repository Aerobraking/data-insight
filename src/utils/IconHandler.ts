
import fs from "fs";

export class Handler {

    private hash: Map<String, string> = new Map();
    private static _instance = new Handler();

    private constructor() { }

    static get instance() {
        return this._instance;
    }

    private app: any = require("electron").remote.app;

    registerPath(path: string, callback: (url: string) => void): void {

        try {
            fs.accessSync(path, fs.constants.F_OK);

            if (fs.lstatSync(path).isDirectory()) {
                callback(" data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAEuWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iCiAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgZXhpZjpQaXhlbFhEaW1lbnNpb249IjUxMiIKICAgZXhpZjpQaXhlbFlEaW1lbnNpb249IjUxMiIKICAgZXhpZjpDb2xvclNwYWNlPSIxIgogICB0aWZmOkltYWdlV2lkdGg9IjUxMiIKICAgdGlmZjpJbWFnZUxlbmd0aD0iNTEyIgogICB0aWZmOlJlc29sdXRpb25Vbml0PSIyIgogICB0aWZmOlhSZXNvbHV0aW9uPSIzMDAvMSIKICAgdGlmZjpZUmVzb2x1dGlvbj0iMzAwLzEiCiAgIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiCiAgIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIKICAgeG1wOk1vZGlmeURhdGU9IjIw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");
                return;
            }
        } catch (e) {
            return;
        }

        let filetype = path.split('.').pop();
        if (filetype) {
            if (this.hash.has(filetype)) {
                let e = this.hash.get(filetype);
                if (e) {
                    callback(e);
                    return;
                }
            }

            this.app
                .getFileIcon(path, {
                    size: "normal",
                }).then((res: Electron.NativeImage) => {
                    if (filetype) {
                        this.hash.set(filetype, res.toDataURL());
                        callback(res.toDataURL());
                    }
                });

            return this.app
                .getFileIcon(path, {
                    size: "large",
                });

        }
    }


}

export const IconHandler = Handler.instance;

