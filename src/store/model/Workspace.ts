
import { View } from "./DataModel";
import * as _ from "underscore";
import { Type } from "class-transformer";
import { ElementDimension } from "@/utils/resize";

export class WorkspaceEntry {
    constructor(componentname: string, isResizable: boolean) {
        this.id = Math.random() * 1000000;
        this.isResizable = isResizable;
        this.componentname = componentname;
    }

    componentname: string = "";
    displayname: string = "";
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

    public searchLogic(input: string): boolean {
        return this.displayname.toLowerCase().includes(input.toLocaleLowerCase());
    }
}

export class WorkspaceEntryFile extends WorkspaceEntry {
    constructor(path: string) {
        super("wsentryfile", false);
        this.path = path != undefined ? path : "";
        this.filename = path != undefined ? _.last(path.split("\\")) != undefined ? <string>_.last(path.split("\\")) : "not found" : "";
        this.name = this.filename;
        this.width = 150;
        this.height = 150;
    }

    name: string;
    path: string;
    filename: string;

    public searchLogic(input: string): boolean {
        let found: boolean = super.searchLogic(input);

        found = found || this.filename.toLocaleLowerCase().includes(input);

        return found;
    }
}

export class WorkspaceEntryImage extends WorkspaceEntry {
    constructor(path: string | undefined) {
        super("wsentryimage", true);

        this.path = path != undefined ? path : "";
        this.filename = path != undefined ? _.last(path.split("\\")) != undefined ? <string>_.last(path.split("\\")) : "not found" : "";
        this.name = this.filename;
        this.width = 600;
        this.height = 600;
    }


    public searchLogic(input: string): boolean {
        let found: boolean = super.searchLogic(input);
        found = found || this.filename.toLocaleLowerCase().includes(input);
        return found;
    }

    getURL(): string {
        return "file://" + this.path.replaceAll("\\", "/");
    }

    name: string;
    path: string;
    filename: string;
}

export class WorkspaceEntryYoutube extends WorkspaceEntry {
    constructor(url: string = "") {
        super("wsentryyoutube", true);

        this.url = url;
        this.name = url;
        this.width = 600;
        this.height = 600;
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
    constructor(text: string = "") {
        super("wsentrytextarea", true);
        this.width = 400;
        this.height = 250;
    }

    text: string = "";

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

    color: string = "rgb(10,10,10)";
}

export class WorkspaceEntryFolderWindow extends WorkspaceEntry {

    public static viewid: string = "wsentryfolderview";

    constructor(path: string) {
        super("wsentryfolderview", true);
        this.path = path != undefined ? path : "";
        this.defaultPath = path != undefined ? path : "";
        this.foldername = path != undefined ? _.last(path.split("\\")) != undefined ? <string>_.last(path.split("\\")) : "not found" : "";
        this.name = this.foldername;
        this.id = Math.random() * 10000;
        this.sort = "asc";
        this.width = 600;
        this.height = 600;
    }


    public searchLogic(input: string): boolean {
        let found: boolean = super.searchLogic(input);
        found = found || this.foldername.toLocaleLowerCase().includes(input);
        return found;
    }

    name: string;
    path: string;
    defaultPath: string;
    foldername: string;
    sort: "manual" | "asc" | "desc";
}

export class FolderWindowFile {

    constructor(path: string, isDirectory: boolean, size: number) {
        this.path = path;
        this.filename = _.last(path.split("\\")) != undefined ? <string>_.last(path.split("\\")) : "not found";
        this.isDirectory = isDirectory;
        this.size = size;
    }

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
    }

    viewportTransform: { x: number, y: number, scale: number } = { x: 1, y: 1, scale: 0.333 }

    @Type(() => WorkspaceEntry, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'componentname',
            subTypes: [
                { value: WorkspaceEntryFile, name: 'wsentryfile' },
                { value: WorkspaceEntryImage, name: 'wsentryimage' },
                { value: WorkspaceEntryYoutube, name: 'wsentryyoutube' },
                { value: WorkspaceEntryTextArea, name: 'wsentrytextarea' },
                { value: WorkspaceEntryFolderWindow, name: 'wsentryfolderview' },
                { value: WorkspaceEntryFrame, name: 'wsentryframe' },
            ],
        },
    })
    entries: Array<WorkspaceEntry> = [];
}