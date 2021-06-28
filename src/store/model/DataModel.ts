import * as _ from "underscore";

export abstract class View {
    id: number = 0;
    isActive: boolean = false;
    name: string = "";
    type: string = "";
}

export class WorkspaceEntry {
    constructor(componentname: string) {
        this.id = Math.random() * 10000;
        this.componentname = componentname;
    }
    componentname: string = "";
    x: number = 0;
    y: number = 0;
    id: number = 0;
    isSelected: boolean = false;
    name: string = "";
    isResizable: boolean = false;
    width: number = 100;
    height: number = 100;
}

export class WorkspaceEntryFile extends WorkspaceEntry {
    constructor(path: string) {
        super("wsentry");
        this.path = path;
        this.filename = _.last(path.split("\\")) != undefined ? <string>_.last(path.split("\\")) : "not found";
        this.name = this.filename;
        this.id = Math.random() * 10000;
    }

    path: string;
    filename: string;
}

const fs = require("fs");
const path = require("path");


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
export class StartScreen extends View {

    constructor(name: string = "New Workspace") {
        super();
        this.name = name;
        this.type = "startscreen";
        this.isActive = true;
    }


}


export class Overview extends View {

    constructor(name: string = "New Overview") {
        super();
        this.name = name;
        this.type = "overview";
    }

    initialZoom: number = 1;
    initialX: number = 1;
    initialY: number = 1;
    entries: Array<WorkspaceEntry> = [];
}