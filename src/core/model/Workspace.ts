import * as _ from "underscore";
import { Expose, Type } from "class-transformer"; 
import View from "./AbstractView";
import { AbstractNodeShell } from "./overview/AbstractNodeShell";
import { Instance } from "./overview/OverviewDataCache";
import { FeatureSettingsList } from "./overview/AbstractNodeFeatureView";
import { Feature } from "./overview/AbstractNodeFeature";
import { WorkspaceEntryFrame } from "./WorkspaceEntryFrame";
import { WorkspaceEntryFile, WorkspaceEntryImage, WorkspaceEntryYoutube, WorkspaceEntryVideo, WorkspaceEntryTextArea, WorkspaceEntryFolderWindow } from "@/filesystem/model/FileSystemWorkspaceEntries";
import { FolderNodeShell } from "@/filesystem/model/FolderNodeShell";
import WorkspaceEntry from "./WorkspaceEntry";

export class Overview {

    viewportTransform: { x: number, y: number, scale: number } = { x: 0, y: 0, scale: 0.05 }

    @Expose({ name: 'featureSettings' })
    featureSettings: FeatureSettingsList = {};
    showAll: boolean = false;
    highlightSelection: boolean = false;

    featureActive: Feature | undefined = Feature.FolderSize;

    @Type(() => AbstractNodeShell, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'nodetype',
            subTypes: [
                { value: FolderNodeShell, name: 'folder' }
            ],
        },
    })
    rootNodes: AbstractNodeShell[] = [];

    public initAfterLoading() {
        for (let i = 0; i < this.rootNodes.length; i++) {
            const v = this.rootNodes[i];
            v.initAfterLoading();
        }
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
    viewportTransform: { x: number, y: number, scale: number } = { x: 1, y: 1, scale: 0.266 }
    paneSize: number = 75;
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
        Instance.storeData(this);
    }

}
