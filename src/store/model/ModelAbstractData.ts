import * as _ from "underscore";
import { Type } from "class-transformer";
import { ElementDimension } from "@/utils/resize";
import { Instance } from "@/store/model/OverviewTransferHandler";
import { FolderOverviewEntry } from "@/store/model/FileSystem/FileEngine";
import { AbstractOverviewEntry } from "./AbstractOverEntry";
import { WorkspaceEntryFile, WorkspaceEntryImage, WorkspaceEntryYoutube, WorkspaceEntryTextArea, WorkspaceEntryFolderWindow, WorkspaceEntryFrame, WorkspaceEntryVideo } from "./FileSystem/FileSystemEntries";
import WorkspaceEntry from "./WorkspaceEntry";
// import * as NodeFeatures from "./AbstractNodeFeature";




export class Overview {

    constructor() {
        this.id = Math.floor(Math.random() * 1000000000000);
        // NodeFeatures.getFeatures();
        //  this.features = NodeFeatures.getFeatures();
    }

    id: number;
    viewportTransform: { x: number, y: number, scale: number } = { x: 0, y: 0, scale: 0.25 }
    gradientId: string = "";
    // features: NodeFeatures.AbstractNodeFeature[];
    // activeFeatureId: string|undefined;

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
                { value: WorkspaceEntryVideo, name: 'wsentryvideo' },
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

