import { Overview } from "./model/OverviewDataModel"
import { Workspace } from "./model/Workspace"
import { Type, plainToClass } from 'class-transformer';
import { View } from "./model/DataModel";

export class InsightFile {
    @Type(() => View, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'type',
            subTypes: [
                { value: Workspace, name: 'workspace' },
                { value: Overview, name: 'overview' },
            ],
        },
    })
    views: Array<Workspace | Overview> = [];
    selectedViewIndex: number = 0;
}

export const state: {
    // views: Array<Workspace | Overview>,
    // selectedViewIndex: number,
    loadedFile: InsightFile
} = {
    // views: [

    // ],
    // selectedViewIndex: 0,
    loadedFile: {
        views: [

        ],
        selectedViewIndex: 0
    }
}
export type State = typeof state
