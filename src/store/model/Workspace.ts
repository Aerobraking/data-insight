
import { View } from "./DataModel";
import * as _ from "underscore";
import { rgb } from "d3";

export class Workspace extends View {

    constructor(name: string = "New Workspace") {
        super();
        this.name = name;
        this.type = "workspace";
    }

    initialZoom: number = 1;
    initialX: number = 1;
    initialY: number = 1;
    entries: Array<WorkspaceEntry> = [];
}


export class WorkspaceEntry {
    constructor(componentname: string) {
        this.id = Math.random() * 1000000;
        this.componentname = componentname;
    }
    componentname: string = "";
    x: number = 0;
    y: number = 0;
    id: number = 0;
    isSelected: boolean = false;
    name: string = "";
    isResizable: boolean = false; 
    width: number = 220;
    height: number = 180;
}

export class WorkspaceEntryFile extends WorkspaceEntry {
    constructor(path: string) {
        super("wsentry");
        this.path = path;
        this.filename = _.last(path.split("\\")) != undefined ? <string>_.last(path.split("\\")) : "not found";
        this.name = this.filename;
        this.width = 150;
        this.height = 150;
    }

    path: string;
    filename: string;
}

export class WorkspaceEntryImage extends WorkspaceEntry {
    constructor(path: string) {
        super("wsentryimage");

        this.path = path;
        this.filename = _.last(path.split("\\")) != undefined ? <string>_.last(path.split("\\")) : "not found";
        this.name = this.filename;
        this.width = 600;
        this.height = 600;
    }

    getURL(): string {
        return "file://" + this.path.replaceAll("\\", "/");
    }

    path: string;
    filename: string;
}

export class WorkspaceEntryYoutube extends WorkspaceEntry {
    constructor(url: string) {
        super("wsentryyoutube");

        this.videoId = WorkspaceEntryYoutube.getId(url);
        this.url = url;
        this.name = url;
        this.width = 600;
        this.height = 600;
    }

    static getId(url: string) {
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        var match = url.match(regExp);

        if (match && match[2].length == 11) {
            return match[2];
        } else {
            return 'error';
        }
    }

    getURL(): string {
        return this.url;
    }
    getURLCookieFree(): string {
        return this.url.replace("youtube.com", "youtube-nocookie.com");
    }

    getHtmlCode(): string {
        return '<iframe  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-top-navigation allow-top-navigation-by-user-activation" src="https://www.youtube-nocookie.com/embed/' + this.videoId + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
        // return `<iframe width="1440" height="762" src="${this.getURLCookieFree()}"
        // frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }

    videoId: string;
    url: string;
    name: string;
}

export class WorkspaceEntryTextArea extends WorkspaceEntry {
    constructor(text: string = "") {
        super("wsentrytextarea");
        this.width = 400;
        this.height = 250;
    }

    text: string = "";
}
export class WorkspaceEntryFrame extends WorkspaceEntry {
    constructor(text: string = "") {
        super("wsentryframe");
        this.width = 1400;
        this.height = 1400;
    }

    color: string = "rgb(10,10,10)";
}

export class WorkspaceEntryFolderWindow extends WorkspaceEntry {

    public static viewid: string = "wsentryfolderview";

    constructor(path: string) {
        super("wsentryfolderview");
        this.path = path;
        this.defaultPath = path;
        this.foldername = _.last(path.split("\\")) != undefined ? <string>_.last(path.split("\\")) : "not found";
        this.name = this.foldername;
        this.id = Math.random() * 10000;
        this.sort = "asc";
        this.width = 600;
        this.height = 600;
    }

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

