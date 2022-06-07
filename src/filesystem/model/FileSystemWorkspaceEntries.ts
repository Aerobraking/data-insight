import _ from "underscore";
import * as f from "@/filesystem/utils/FileStringFormatter";
import AbstractWorkspaceEntry from "@/core/model/fileactivity/workspace/WorkspaceEntry";
import { Exclude, Expose } from "class-transformer";
import WorkspaceEntryAspectRatio from "@/core/model/fileactivity/workspace/WorkspaceEntryAspectRatio";
import { ImageDim } from "@/filesystem/utils/ImageCache";

export class WorkspaceEntryFile extends AbstractWorkspaceEntry {
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
    readonly isInsideSelectable: boolean = true;
    @Exclude()
    readonly typeNameReadable: string = "Files";

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

export class WorkspaceEntryImage extends AbstractWorkspaceEntry implements WorkspaceEntryAspectRatio {
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

    @Exclude()
    imgOriginalLoaded: boolean = false;
    @Exclude()
    aspectratio: ImageDim | undefined
    @Exclude()
    imgOriginal: HTMLImageElement | undefined;
    previewBase64: string | undefined = undefined;
    blob: string | undefined = undefined;
    isClipboard: boolean;
    name: string;
    path: string;
    filename: string;
    imageCreated: boolean;
    @Exclude()
    readonly typeNameReadable: string = "Image";

    readonly isInsideSelectable: boolean = true;
}

export class WorkspaceEntryVideo extends AbstractWorkspaceEntry implements WorkspaceEntryAspectRatio {

    @Exclude()
    aspectratio: ImageDim | undefined
    path: string;
    filename: string;
    created: boolean;
    readonly isInsideSelectable: boolean = true;
    @Exclude()
    readonly typeNameReadable: string = "Video";

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

}

export class WorkspaceEntryYoutube extends AbstractWorkspaceEntry {

    // starttime in seconds
    @Expose({ name: 'ts' })
    private _timestamp: number = 0;
    @Expose({ name: 'vi' })
    private _videoId: string = "";
    readonly isInsideSelectable: boolean = true;
    @Exclude()
    readonly typeNameReadable: string = "YouTube";

    constructor(url: string = "") {
        super("wsentryyoutube", true);

        this.videoId = url;

        // var regExp = "(?:http|https|)(?::\\/\\/|)(?:www.|)(?:youtu\\.be\\/|youtube\\.com(?:\\/embed\\/|\\/v\\/|\\/watch\\?v=|\\/ytscreeningroom\\?v=|\\/feeds\\/api\\/videos\\/|\\/user\\\\S*[^\\w\\-\\s]|\\S*[^\\w\\-\\s]))([\\w\\-\\_]{11})[a-z0-9;:@#?&%=+\\/\\$_.-]*";
        // var matchID = url.match(regExp);

        // if (matchID && matchID?.length < 2) {
        //     this.alert = url.length > 0 ? "Youtube ID could not be parsed" : "";
        //     url = "";
        //     undefined;
        // }
        // this._videoId = matchID && matchID?.length > 1 ? matchID[1] : url;

        // var matchtimestamp = url.match("t\\=\\d+");
        // this.timestamp = matchtimestamp && matchtimestamp?.length > 1 ? +matchtimestamp[1].replace("t=", "") : 0;

        this.width = 600;
        this.height = 600;
    }

    public searchResultString(): string {
        return this.videoId;
    }

    public getVideoId(): string | undefined {
        return this.videoId;
    }

    public get videoId(): string {
        return this._videoId;
    }

    public set videoId(value: string) {
        var regExp = "(?:http|https|)(?::\\/\\/|)(?:www.|)(?:youtu\\.be\\/|youtube\\.com(?:\\/embed\\/|\\/v\\/|\\/watch\\?v=|\\/ytscreeningroom\\?v=|\\/feeds\\/api\\/videos\\/|\\/user\\\\S*[^\\w\\-\\s]|\\S*[^\\w\\-\\s]))([\\w\\-\\_]{11})[a-z0-9;:@#?&%=+\\/\\$_.-]*";
        var matchID = value.match(regExp);

        if (matchID) {
            this.alert = undefined;
            this._videoId = matchID[1];
            var matchtimestamp = value.match("t\\=\\d+");
            this.timestamp = matchtimestamp ? +matchtimestamp[0].replace("t=", "") : 0;
        } else {
            this.alert = "Youtube ID could not be parsed";
            this._videoId = value.length > 11 ? value.substring(0, 11) : value;
        }
    }

    /**
     * https://www.youtube.com/watch?v=vgEpzumACUc&t=3s
     * @returns 
     */
    public getYouTubeLink(): string {
        return `https://www.youtube.com/watch?v=${this.videoId}&t=${this.getTimestamp()}s`;
    }

    public get timestamp(): number {
        return f.timeHHMMSSFormat(this._timestamp) as any;
    }

    public set timestamp(value: number) {
        let time = 0;
        if (_.isNumber(value)) {
            time = value;
        } else if (_.isString(value)) {
            var a = (value as any).split(':'); // split it at the colons
            // minutes are worth 60 seconds. Hours are worth 60 minutes.
            time = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
        }
        this._timestamp = Math.floor(time < 0 ? 0 : time > 60 * 60 * 60 ? 60 * 60 * 60 : time);
    }

    /**
     * 
     * @returns The Timestamp in seconds as a number.
     */
    public getTimestamp(): number {
        return this._timestamp;
    }

}

export class WorkspaceEntryTextArea extends AbstractWorkspaceEntry {

    text: string;
    readonly isInsideSelectable: boolean = true;
    @Exclude()
    readonly typeNameReadable: string = "Note";


    constructor(text: string = "Hello <b>World</b>") {
        super("wsentrytextarea", true);
        this.width = 450;
        this.height = 450;
        this.text = text;
    }

    public searchResultString(): string {
        return "Found inside text";
    }

    public searchLogic(input: string): boolean {
        let found: boolean = super.searchLogic(input);
        found = found || this.text.toLocaleLowerCase().includes(input);
        return found;
    }
}

export class WorkspaceEntryFolderWindow extends AbstractWorkspaceEntry {

    public static viewid: string = "wsentryfolder";
    mode: "tile" | "list" = "tile";
    fileList: Array<FolderWindowFile> = [];
    name: string;
    path: string;
    defaultPath: string;
    foldername: string;
    sort: "manual" | "asc" | "desc";
    readonly isInsideSelectable: boolean = false;
    @Exclude()
    readonly typeNameReadable: string = "Folder";


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

}

export class FolderWindowFile {

    constructor(path: string, isDirectory: boolean, size: number, name: string | undefined = undefined) {
        this.path = path;
        path = path.endsWith("/") ? path.slice(0, -1) : path;
        this.filename = _.last(path.split("/")) != undefined ? <string>_.last(path.split("/")) : "not found";
        if (name) this.filename = name;
        this.isDirectory = isDirectory;
        this.size = size;
    }

    getSizeFormatted() {
        return f.filesizeFormat(this.size);
    }

    id!: number;
    path: string;
    filename: string;
    size: number;
    isDirectory: boolean;
    loadImage: boolean = false;

}
