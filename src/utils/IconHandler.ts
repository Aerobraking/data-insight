import { FSWatcher } from "chokidar";

const fs = require("fs");

export class Handler {

    private hash: Map<String, string> = new Map();
    private static _instance = new Handler();

    private constructor() { }

    static get instance() {
        return this._instance;
    }

    private app: any = require("electron").remote.app;

    registerPath(path: string, callback: (url: string) => void): void {

        if (fs.lstatSync(path).isDirectory()) {
            callback(" data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAEsmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iCiAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgZXhpZjpQaXhlbFhEaW1lbnNpb249IjQ4IgogICBleGlmOlBpeGVsWURpbWVuc2lvbj0iNDgiCiAgIGV4aWY6Q29sb3JTcGFjZT0iMSIKICAgdGlmZjpJbWFnZVdpZHRoPSI0OCIKICAgdGlmZjpJbWFnZUxlbmd0aD0iNDgiCiAgIHRpZmY6UmVzb2x1dGlvblVuaXQ9IjIiCiAgIHRpZmY6WFJlc29sdXRpb249IjMwMC4wIgogICB0aWZmOllSZXNvbHV0aW9uPSIzMDAuMCIKICAgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIKICAgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIgogICB4bXA6TW9kaWZ5RGF0ZT0iMjAyMS0wOC0yM1QxNDowNzoxMyswMjowMCIKICAgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMS0wOC0yM1QxNDowNzoxMyswMjowMCI+CiAgIDx4bXBNTTpIaXN0b3J5PgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaQogICAgICBzdEV2dDphY3Rpb249InByb2R1Y2VkIgogICAgICBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZmZpbml0eSBQaG90byAxLjEwLjAiCiAgICAgIHN0RXZ0OndoZW49IjIwMjEtMDgtMjNUMTQ6MDc6MTMrMDI6MDAiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KPD94cGFja2V0IGVuZD0iciI/PqjG4rEAAAGCaUNDUHNSR0IgSUVDNjE5NjYtMi4xAAAokXWRzytEURTHPzPI5EcUxcJiElYz8qNEymLkV2Ex85TBZubNvBk1M17vvUmyVbaKEhu/FvwFbJW1UkRKdsqa2KDnPG9qJHNu557P/d57TveeC14lo2bN8i7I5iwjPBbyz0bn/JVP+GiimkGCMdXUpyKjCiXt/RaPE6+DTq3S5/616kTSVMHjEx5SdcMSHheeXLZ0h7eEG9V0LCF8Ihww5ILCN44ed/nZ4ZTLnw4bSngYvPXC/tQvjv9iNW1kheXltGUzebVwH+clNcncTERiq3gLJmHGCOFnghGG6aObAZn7CNJDp6wokd/1kz/NkuSqMuusYLBIijQWAVHzUj0pURM9KSPDitP/v301td4et3pNCCoebfu1HSo34WvDtj8ObPvrEMoe4DxXzF/ah/430TeKWtse1K3B6UVRi2/D2To03+sxI/YjlYl7NQ1ejqE2Cg1XUDXv9qywz9EdKKvyVZewswsdcr5u4RvS/mgXEuYlTwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAASdJREFUWIXt2DFKA0EUxvHvTTJJIIagEiwsbCwscoGAWIi38By2XiQHMJ0XEAtbL2EpEYwsGM3E3WeRVXBd+dRkyRTv3+1jH/yK2S1GVBUx5dYNKGYgloFY0YHqxcE8gWZ8z29Avu2uIin8h7LrI3285Ws7J24wQr1dGWh8gacrAPpwgzD56W2dp5q85pvbA3d4Cd+tBnR3jvvhbxb0OWSTaf7Q7KGxtRKH2zuVgzOUnCGWtBuuJjp7AwAkQLIUJFWdBgA6GwvwHxAAaXlp+aUcH2lIF6DPovvsDcQyEMtALAOxDMQyEMtALAOxDMQyEMtALAOxKrlS+UN+U3aPAUi3vxisGSSdfemPvkzy24/sBVkoX6pW5FDrlIGiKbpDbSCWgVjRgd4BdhZNyb1UFv0AAAAASUVORK5CYII=");
            return ;
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

