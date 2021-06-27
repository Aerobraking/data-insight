import * as _ from "underscore";

export abstract class View {
    id: number = 0;
    isActive: boolean = false;
    name: string = "";
    type: string = "";
}

export class WorkspaceEntry {
    constructor() {
        this.id = Math.random() * 10000;
    }
    componentname: string="wsentry";
    x: number = 0;
    y: number = 0;
    id: number = 0;
    isSelected: boolean = false;
    name: string = "";
}

export class WorkspaceEntryFile extends WorkspaceEntry {
    constructor(path: string) {
        super();
        this.path = path;
        this.filename = _.last(path.split("\\")) != undefined ? <string>_.last(path.split("\\")) : "not found";
        this.name=this.filename;
        this.id = Math.random() * 10000;
    }

    path: string;
    filename: string;
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