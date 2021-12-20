import * as _ from "underscore";
import { Type } from "class-transformer";
import { ElementDimension } from "@/utils/resize";
import { Instance } from "@/store/model/OverviewTransferHandler";
import { FolderOverviewEntry } from "@/store/model/FileEngine";
import { AbstractOverviewEntry } from "@/store/model/OverviewData";
import { WorkspaceEntryFile, WorkspaceEntryImage, WorkspaceEntryYoutube, WorkspaceEntryTextArea, WorkspaceEntryFolderWindow, WorkspaceEntryFrame } from "./ModelFileSystem";
  
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
    displaynameResize: boolean = false;
    showDisplayname: boolean = true;
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

export class Overview {

    constructor() {
        this.id = Math.floor(Math.random() * 1000000000000);
    }

    id: number;
    viewportTransform: { x: number, y: number, scale: number } = { x: 0, y: 0, scale: 0.25 }
    gradientId: string = "";

    @Type(() => AbstractOverviewEntry, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'nodetype',
            subTypes: [
                { value: FolderOverviewEntry, name: 'folder' }
            ],
        },
    })
    rootNodes: AbstractOverviewEntry[] = [];

    public initAfterLoading() {
        for (let i = 0; i < this.rootNodes.length; i++) {
            const v = this.rootNodes[i];
            v.initAfterLoading();
        }
    }

}

export abstract class View {
    order: number = 0;
    id: number = 0;
    isActive: boolean = false;
    name: string = "";
    type: string = "";

    public setActive(a: boolean): this {
        this.isActive = a;
        return this;
    }
}

export class Workspace extends View {

    constructor(name: string = "New Workspace") {
        super();
        this.name = name;
        this.type = "workspace";
        this.overview = new Overview();
        this.overviewOpen = true;
    }

    @Type(() => Overview)
    overview: Overview;
    viewportTransform: { x: number, y: number, scale: number } = { x: 1, y: 1, scale: 0.666 }
    paneSize: number = 100;
    showBookmarks: boolean = true;
    showFilterSettings: boolean = true;
    overviewOpen: boolean;
    folderSelectionPath: string | undefined = undefined;

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