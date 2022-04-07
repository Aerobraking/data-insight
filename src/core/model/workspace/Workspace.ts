import * as _ from "underscore";
import { Expose, Type } from "class-transformer";
import View from "../AbstractView";
import { AbstractNodeTree } from "./overview/AbstractNodeTree";
import { Instance } from "./overview/OverviewDataCache";
import { FeatureSettingsList } from "./overview/AbstractFeature";
import { FeatureType } from "./overview/FeatureType";
import { WorkspaceEntryFrame } from "./WorkspaceEntryFrame";
import { WorkspaceEntryFile, WorkspaceEntryImage, WorkspaceEntryYoutube, WorkspaceEntryVideo, WorkspaceEntryTextArea, WorkspaceEntryFolderWindow } from "@/filesystem/model/FileSystemWorkspaceEntries";
import { FolderNodeTree as FolderNodeTree } from "@/filesystem/model/FolderNodeTree";
import AbstractWorkspaceEntry from "./WorkspaceEntry";

/**
 * All data belonging to the overview are inside this class.
 * The overview is a "subview" of the workspace.
 */
export class Overview {

    /**
     * Transformation of the view of the overview (a canvas element)
     */
    viewportTransform: { x: number, y: number, scale: number } = { x: 0, y: 0, scale: 0.05 }

    /**
     * For Each feature exists a settings object which controls its visualization.
     * The default setting objects are created and added as properties here automatically
     * when a workspace is created, so you don't have to to that by hand. :)  
     */
    @Expose({ name: 'featureSettings' })
    featureSettings: FeatureSettingsList = {};

    /**
     * true: the viewportTransform is set automatically to show all nodes.
     * false: this mode is disabled. 
     */
    showAll: boolean = false;

    /**
     * true: when a node is selected, all nodes that are not their descendents or
     * ascendets are partially hidden
     * false: all nodes are shown all the time.
     */
    highlightSelection: boolean = false;

    /**
     * The enum of the active Feature that will be used for visualization of the
     * nodes in the overview.
     */
    featureActive: FeatureType | undefined = FeatureType.FolderSize;

    @Type(() => AbstractNodeTree, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'nt',
            subTypes: [
                { value: FolderNodeTree, name: 'folder' }
            ],
        },
    })
    trees: AbstractNodeTree[] = [];

    public initAfterLoading() {
        for (let i = 0; i < this.trees.length; i++) {
            const v = this.trees[i];
            v.initAfterLoading();
        }
    }

}

/**
 * Represents one Workspace inside an InsightFile. A Workspace is a list of WorkspaceEntry Objects
 * that can be placed on an infinite sized zoomable and pannable area.
 */
export class Workspace extends View {

    constructor(name: string = "New Workspace") {
        super();
        this.name = name;
    }

    @Type(() => Overview)
    overview: Overview = new Overview();

    /**
     * Transformation of the view of the workspace (a div element) 
     * (the left pane where the workspace entries are displayed)
     */
    viewportTransform: { x: number, y: number, scale: number } = { x: 1, y: 1, scale: 0.266 }

    /**
     * percentage (0-100) of the size of the left pane in the workspace UI.
     */
    paneSize: number = 75;

    /**
     * wether the bookmarks are shown or hidden.
     */
    showBookmarks: boolean = true;

    /**
     * wether the settings for the features are shown or hidden in the overview ui.
     */
    showFeatureSettings: boolean = true;

    /**
     * true: paneSize<100, the overview UI is visible
     * false: paneSize=100, overview UI is not visible
     */
    overviewOpen: boolean = true;

    /**
     * The last path were files were selected for adding to the workspace.
     */
    folderSelectionPath: string | undefined = undefined;

    /**
     * used for loading the class again from json data with the class-transformer
     */
    type = "ws";

    /**
     * EXTEND APP
     * 
     * All classes that implement the WorkspaceEntry class needs to be listed 
     * in the subTypes here with a unique name in their 'et' property, so they
     * can be loaded from json data with the class-transformer package.
     */
    @Type(() => AbstractWorkspaceEntry, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'et', // entry type
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
         * Removes the node data of the overview from the vuex store
         * so it won't create events everytime the data changes, which
         * happens a lot of times. Otherwise the performance would
         * be a mess.
         */
        Instance.storeData(this);
    }

}

