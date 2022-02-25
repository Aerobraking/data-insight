import * as _ from "underscore";
import { Type } from "class-transformer"; 
import AbstractWorkspaceEntry from "./WorkspaceEntry";
import { WorkspaceEntryFrame } from "./WorkspaceEntryFrame";
import { WorkspaceEntryFile, WorkspaceEntryImage, WorkspaceEntryYoutube, WorkspaceEntryVideo, WorkspaceEntryTextArea, WorkspaceEntryFolderWindow } from "@/filesystem/model/FileSystemWorkspaceEntries";


export default class WorkspaceEntryCollection {

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