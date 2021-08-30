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
    views: Array<Workspace> = [new Workspace("Default").setActive(true)]; 
}

export class UserSettings {
    recentFiles: string[] = [];
    loadLastFile: boolean = true;
    loadedFilePath: string = "";
}

export const state: {
    userSettings: UserSettings,
    loadedFile: InsightFile
} = {
    userSettings: new UserSettings(),
    loadedFile: new InsightFile(),
}
export type State = typeof state
