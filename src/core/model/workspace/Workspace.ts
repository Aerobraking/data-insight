import * as _ from "underscore";
import { Expose, Type } from "class-transformer"; 
import View from "../AbstractView";
import { AbstractNodeShell } from "./overview/AbstractNodeShell";
import { Instance } from "./overview/OverviewDataCache";
import { FeatureSettingsList } from "./overview/AbstractFeature";
import { FeatureType } from "./overview/FeatureType";
import { WorkspaceEntryFrame } from "./WorkspaceEntryFrame";
import { WorkspaceEntryFile, WorkspaceEntryImage, WorkspaceEntryYoutube, WorkspaceEntryVideo, WorkspaceEntryTextArea, WorkspaceEntryFolderWindow } from "@/filesystem/model/FileSystemWorkspaceEntries";
import { FolderNodeShell } from "@/filesystem/model/FolderNodeShell";
import AbstractWorkspaceEntry from "./WorkspaceEntry";

export class Overview {

    viewportTransform: { x: number, y: number, scale: number } = { x: 0, y: 0, scale: 0.05 }

    @Expose({ name: 'featureSettings' })
    featureSettings: FeatureSettingsList = {};
    showAll: boolean = false;
    highlightSelection: boolean = false;

    featureActive: FeatureType | undefined = FeatureType.FolderSize;

    @Type(() => AbstractNodeShell, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'nt',
            subTypes: [
                { value: FolderNodeShell, name: 'folder' }
            ],
        },
    })
    shells: AbstractNodeShell[] = [];

    public initAfterLoading() {
        for (let i = 0; i < this.shells.length; i++) {
            const v = this.shells[i];
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

    @Type(() => AbstractWorkspaceEntry, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'et',
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
    entries: Array<AbstractWorkspaceEntry> = [];

    public initAfterLoading() {
        this.overview.initAfterLoading();

        /**
         * remove the node data from the vuex store
         */
        Instance.storeData(this);
    }

}

