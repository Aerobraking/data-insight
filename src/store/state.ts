import { View, Workspace } from "./model/ModelAbstractData"
import { Type } from 'class-transformer';

export class InsightFile {
    @Type(() => View, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'type',
            subTypes: [
                { value: Workspace, name: 'workspace' }
            ],
        },
    })
    views: Array<Workspace> = [new Workspace("Default").setActive(true)];
    settings: InsightFileSettings = new InsightFileSettings();

    public initAfterLoading() {
        for (let i = 0; i < this.views.length; i++) {
            const v = this.views[i];
            v.initAfterLoading();
        }
    }
}

export class InsightFileSettings {
    showUI: boolean = true;
    filePath: string = "";
}

export class UserSettings {
    recentFiles: string[] = [];
    loadLastFile: boolean = true;
    loadedFilePath: string = "";
}

export type State = {
    userSettings: UserSettings,
    loadedFile: InsightFile
}

