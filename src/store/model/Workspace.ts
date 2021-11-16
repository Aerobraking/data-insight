
import { View } from "./DataModel";
import * as _ from "underscore";
import { Type } from "class-transformer";
import { ElementDimension } from "@/utils/resize";
import { Overview } from "./OverviewDataModel";
import { ImageCache, ImageDim } from "@/utils/ImageCache";
import { Instance } from "@/components/workspace/overview/OverviewTransferHandler";

const fs = require("fs");
const path = require("path");

export class WorkspaceEntry {
    constructor(componentname: string, isResizable: boolean) {
        this.id = Math.floor(Math.random() * 1000000000000);
        this.isResizable = isResizable;
        this.componentname = componentname;

        this.typename = this.componentname.replaceAll("wsentry", "");
        this.typename = this.typename.charAt(0).toUpperCase() + this.typename.slice(1);
    }

    order: number = 0;
    typename: string = "";
    componentname: string = "";
    displayname: string = "";
    displaynameResize: boolean = true;
    x: number = 0;
    y: number = 0;
    id: number = 0;
    isSelected: boolean = false;
    isResizable: boolean = false;
    width: number = 220;
    height: number = 180;

    public setDimensions(d: ElementDimension) {
        this.x = d.x;
        this.y = d.y;
        if (this.isResizable) {
            this.width = d.w;
            this.height = d.h;
        }
    }

    public searchResultString(): string {
        return " - ";
    }

    public searchLogic(input: string): boolean {
        return this.displayname.toLowerCase().includes(input.toLocaleLowerCase());
    }

    public getFilesForDragging(): string[] {
        return [];
    }
}

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

        // ImageCache.registerPath(this.getURL(), {
        //     callback: (
        //       url: string,
        //       type: "small" | "medium" | "original"
        //     ) => {},
        //     callbackSize: (dim: ImageDim) => {},
        //   }
        //   );
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

    blob: string = "";
    isClipboard: boolean;
    name: string;
    path: string;
    filename: string;
    imageCreated: boolean;
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

    getId(): string | null {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = this.url.match(regExp);

        if (match && match[2].length == 11) {
            this.videoId = match[2];
            return match[2];
        } else {
            return null;
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
        return '<iframe  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-top-navigation allow-top-navigation-by-user-activation" '
            + 'src="https://www.youtube-nocookie.com/embed/' + this.getId() + '" title="YouTube video player" frameborder="0" allow="accelerometer; '
            + 'autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
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
    constructor(text: string = "") {
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
        return found;
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

        console.log("length: " + this.fileList.length);

    }

    public getFileList(): Array<FolderWindowFile> {

        this.updateFileList();

        return this.fileList;

    }


    fileList: Array<FolderWindowFile> = [];
    name: string;
    path: string;
    defaultPath: string;
    foldername: string;
    sort: "manual" | "asc" | "desc";
}

export class FolderWindowFile {

    constructor(path: string, isDirectory: boolean, size: number) {
        this.path = path;
        this.filename = _.last(path.split("/")) != undefined ? <string>_.last(path.split("/")) : "not found";
        this.isDirectory = isDirectory;
        this.size = size;
        this.id = Math.floor(Math.random() * 1000000000000);
    }

    id: number;
    path: string;
    filename: string;
    size: number;
    isDirectory: boolean;
}

export class Workspace extends View {

    constructor(name: string = "New Workspace") {
        super();
        this.name = name;
        this.type = "workspace";
        this.overview = new Overview();
        this.overviewOpen = false;
    }

    @Type(() => Overview)
    overview: Overview;
    viewportTransform: { x: number, y: number, scale: number } = { x: 1, y: 1, scale: 0.666 }
    overviewOpen: boolean;

    @Type(() => WorkspaceEntry, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'componentname',
            subTypes: [
                { value: WorkspaceEntryFile, name: 'wsentryfile' },
                { value: WorkspaceEntryImage, name: 'wsentryimage' },
                { value: WorkspaceEntryYoutube, name: 'wsentryyoutube' },
                { value: WorkspaceEntryTextArea, name: 'wsentrytextarea' },
                { value: WorkspaceEntryFolderWindow, name: 'wsentryfolder' },
                { value: WorkspaceEntryFrame, name: 'wsentryframe' },
            ],
        },
    })
    entries: Array<WorkspaceEntry> = [];

    public initAfterLoading() {
        this.overview.initAfterLoading();

        /**
         * remove the node data from the vuex store
         */
        Instance.storeData(this.overview);
    }


}
export class EntryCollection {


    @Type(() => WorkspaceEntry, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'componentname',
            subTypes: [
                { value: WorkspaceEntryFile, name: 'wsentryfile' },
                { value: WorkspaceEntryImage, name: 'wsentryimage' },
                { value: WorkspaceEntryYoutube, name: 'wsentryyoutube' },
                { value: WorkspaceEntryTextArea, name: 'wsentrytextarea' },
                { value: WorkspaceEntryFolderWindow, name: 'wsentryfolder' },
                { value: WorkspaceEntryFrame, name: 'wsentryframe' },
            ],
        },
    })
    entries: Array<WorkspaceEntry> = [];


}