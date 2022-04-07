import * as _ from "underscore";
import { Type } from "class-transformer";
import AbstractWorkspaceEntry from "./WorkspaceEntry";
import { WorkspaceEntryFrame } from "./WorkspaceEntryFrame";
import { WorkspaceEntryFile, WorkspaceEntryImage, WorkspaceEntryYoutube, WorkspaceEntryVideo, WorkspaceEntryTextArea, WorkspaceEntryFolderWindow } from "@/filesystem/model/FileSystemWorkspaceEntries";

/**
 * This class contains a list of WorkspaceEntry Objects.
 * It is used for serializing them to json data and back. 
 * Because of this it is necessary to define the subTypes here
 * for the class-transformer.
 */
export default class WorkspaceEntryCollection {

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

}