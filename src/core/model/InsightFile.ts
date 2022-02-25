import { Type } from "class-transformer";
import View from "./AbstractView";
import { Workspace } from "./workspace/Workspace";

export class InsightFileSettings {
    showUI: boolean = true;
    filePath: string = "";
}

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
