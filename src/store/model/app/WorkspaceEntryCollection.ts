import * as _ from "underscore";
import { Type } from "class-transformer";
import { WorkspaceEntryFile, WorkspaceEntryImage, WorkspaceEntryYoutube, WorkspaceEntryTextArea, WorkspaceEntryFolderWindow, WorkspaceEntryFrame, WorkspaceEntryVideo } from "../implementations/filesystem/FileSystemEntries";
import WorkspaceEntry from "./WorkspaceEntry";


export default class WorkspaceEntryCollection {

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

}