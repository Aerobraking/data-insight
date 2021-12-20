import * as _ from "underscore";
import { Type } from "class-transformer";
import { ElementDimension } from "@/utils/resize";
import { Instance } from "@/store/model/OverviewTransferHandler";
import { FolderOverviewEntry } from "@/store/model/FileSystem/FileEngine";

import { AbstractOverviewEntry } from "./AbstractOverEntry";
import { WorkspaceEntryFile, WorkspaceEntryImage, WorkspaceEntryYoutube, WorkspaceEntryTextArea, WorkspaceEntryFolderWindow, WorkspaceEntryFrame } from "./FileSystem/FileSystemEntries";
import { WorkspaceEntry } from "./ModelAbstractData";

export default class EntryCollection {

    @Type(() => Object, {
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