// import { path } from "d3";
import _ from "underscore"; 
const fs = require("fs");
const path = require("path");

export class WorkspaceEntryFile extends WorkspaceEntry {
    constructor(path: string) {
        super("wsentryfile", false);
        this.path = path != undefined ? path : "";
        this.filename = path != undefined ? _.last(path.split("/")) != undefined ? <string>_.last(path.split("/")) : "not found" : "";
        this.name = this.filename;
        this.width = 220;
        this.height = 180;
    }

    name: string;
    path: string;
    filename: string;

    public searchResultString(): string {
        return this.filename;
    }

    public getFilesForDragging(): string[] {
        return [this.path];
    }

    public searchLogic(input: string): boolean {
        let found: boolean = super.searchLogic(input);

        found = found || this.filename.toLocaleLowerCase().includes(input);

        return found;
    }
}

export class WorkspaceEntryImage extends WorkspaceEntry {
    constructor(path: string | undefined, clipboard: boolean = false) {
        super("wsentryimage", true);

        this.path = path != undefined ? path : "";
        this.filename = path != undefined ? _.last(path.split("/")) != undefined ? <string>_.last(path.split("/")) : "not found" : "";
        this.name = this.filename;
        this.width = 600;
        this.height = 600;
        this.imageCreated = false;
        this.isClipboard = clipboard;
    }

    public searchResultString(): string {
        return this.filename;
    }

    public getFilesForDragging(): string[] {
        return [this.path];
    }

    public searchLogic(input: string): boolean {
        let found: boolean = super.searchLogic(input);
        found = found || this.filename.toLocaleLowerCase().includes(input);
        return found;
    }

    getURL(): string {
        return this.isClipboard ? this.path : "file://" + this.path;
    }

    previewBase64: string | undefined = undefined;
    blob: string | undefined = undefined;
    isClipboard: boolean;
    name: string;
    path: string;
    filename: string;
    imageCreated: boolean;
}

export class WorkspaceEntryVideo extends WorkspaceEntry {
    constructor(path: string | undefined, clipboard: boolean = false) {
        super("wsentryvideo", true);

        this.path = path != undefined ? path : "";
        this.filename = path != undefined ? _.last(path.split("/")) != undefined ? <string>_.last(path.split("/")) : "not found" : "";
        this.width = 600;
        this.height = 600;
        this.created = false;
    }

    public searchResultString(): string {
        return this.filename;
    }

    public getFilesForDragging(): string[] {
        return [this.path];
    }

    public searchLogic(input: string): boolean {
        let found: boolean = super.searchLogic(input);
        found = found || this.filename.toLocaleLowerCase().includes(input);
        return found;
    }

    path: string;
    filename: string;
    created: boolean;
}

export class WorkspaceEntryYoutube extends WorkspaceEntry {
    constructor(url: string = "") {
        super("wsentryyoutube", true);

        this.url = url;
        this.name = url;
        this.width = 600;
        this.height = 600;
    }

    public searchResultString(): string {
        return this.name;
    }

    getId(): string | undefined {

        var regExp = "(?:http|https|)(?::\\/\\/|)(?:www.|)(?:youtu\\.be\\/|youtube\\.com(?:\\/embed\\/|\\/v\\/|\\/watch\\?v=|\\/ytscreeningroom\\?v=|\\/feeds\\/api\\/videos\\/|\\/user\\\\S*[^\\w\\-\\s]|\\S*[^\\w\\-\\s]))([\\w\\-\\_]{11})[a-z0-9;:@#?&%=+\\/\\$_.-]*";
        var match = this.url.match(regExp);

        if (match) {
            ;
            this.videoId = match[1];
            this.alert = undefined;
            return this.videoId;
        } else {
            // 
            this.alert = this.url.length > 0 ? "Youtube ID could not be parsed" : undefined;
            return undefined;
        }

    }

    getURL(): string {
        return this.url;
    }
    getURLCookieFree(): string {
        return this.url.replace("youtube.com", "youtube-nocookie.com");
    }

    getHtmlCode(): string {
        /**
         * sandbox tags prevent opening any links to other websites.
         */
        const id = this.getId();
        if (id) {
            var match = this.url?.match("t\\=\\d+");
          
            const stamp = match ? `?start=${match[0].replace("t=", "")}` : "";

            return '<iframe  sandbox="allow-presentation allow-scripts allow-same-origin allow-forms allow-modals allow-top-navigation allow-top-navigation-by-user-activation" '
                + 'src="https://www.youtube-nocookie.com/embed/' + id + stamp + '" title="YouTube video player" frameborder="0" allow="accelerometer; '
                + 'autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
        } else {

            return "<div></div>";
        }
    }

    private videoId: string | undefined;
    url: string;
    name: string;
}

export class WorkspaceEntryTextArea extends WorkspaceEntry {
    constructor(text: string = "Hello <b>World</b>") {
        super("wsentrytextarea", true);
        this.width = 450;
        this.height = 450;
        this.text = text;
    }

    public searchResultString(): string {
        return "Found inside text";
    }

    text: string;

    public searchLogic(input: string): boolean {
        let found: boolean = super.searchLogic(input);
        found = found || this.text.toLocaleLowerCase().includes(input);
        return found;
    }
}

export class WorkspaceEntryFrame extends WorkspaceEntry {

    public static viewid: string = "wsentryframe";

    constructor() {
        super("wsentryframe", true);
        this.width = 1400;
        this.height = 1400;
    }

    public searchResultString(): string {
        return "Found inside Name";
    }

    color: string = "rgb(10,10,10)";
}

export class WorkspaceEntryFolderWindow extends WorkspaceEntry {

    public static viewid: string = "wsentryfolder";

    constructor(path: string) {
        super("wsentryfolder", true);
        this.path = path != undefined ? path : "";
        this.defaultPath = path != undefined ? path : "";
        this.foldername = path != undefined ? _.last(path.split("/")) != undefined ? <string>_.last(path.split("/")) : "not found" : "";
        this.name = this.foldername;

        this.sort = "asc";
        this.width = 600;
        this.height = 600;

    }

    public searchResultString(): string {
        return this.foldername;
    }

    public searchLogic(input: string): boolean {
        let found: boolean = super.searchLogic(input);

        for (let index = 0; index < this.fileList.length; index++) {
            const f = this.fileList[index];
            if (f.filename.toLowerCase().includes(input)) {
                return true;
            }
        }

        found = found || this.foldername.toLocaleLowerCase().includes(input);
        return true || found;
    }

    private updateFileList(): void {
        this.fileList = [];

        let c = this;

        const dir = this.path;

        try {
            if (fs.existsSync(this.path)) {
                fs.readdirSync(this.path).forEach((file: any) => {
                    const filePath = path.join(dir, file);
                    const fileStat = fs.lstatSync(filePath);
                    this.fileList.push(
                        new FolderWindowFile(
                            filePath,
                            fileStat.isDirectory(),
                            fileStat.isFile ? fileStat.size : 0
                        )
                    );
                });
            }
        } catch (err) {
            console.error(err);
            this.fileList = [];
        }
  
    }

    public getFileList(): Array<FolderWindowFile> {
        this.updateFileList();
        return this.fileList;
    }

    mode: "tile" | "list" = "tile";
    fileList: Array<FolderWindowFile> = [];
    name: string;
    path: string;
    defaultPath: string;
    foldername: string;
    sort: "manual" | "asc" | "desc";
}
import * as f from "@/utils/format";
import WorkspaceEntry from "../../app/WorkspaceEntry";
export class FolderWindowFile {

    constructor(path: string, isDirectory: boolean, size: number) {
        this.path = path;
        path = path.endsWith("/") ? path.slice(0, -1) : path;
        this.filename = _.last(path.split("/")) != undefined ? <string>_.last(path.split("/")) : "not found";
        this.isDirectory = isDirectory;
        this.size = size;
        this.id = Math.floor(Math.random() * 1000000000000);
    }

    getSizeFormatted() {
        return f.filesizeFormat(this.size);
    }

    id: number;
    path: string;
    filename: string;
    size: number;
    isDirectory: boolean;
}
