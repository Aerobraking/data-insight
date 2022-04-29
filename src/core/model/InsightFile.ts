import { Type } from "class-transformer";
import Activity from "./AbstractView";
import { Workspace } from "./workspace/Workspace";

/**
 * These settings are for things that influence global things of the app.
 */
export class InsightFileSettings {
    /**
     * true: The UI is normal
     * false: Some UI Elements are hidden to enable the "distract free mode"
     */
    showUI: boolean = true;
    /**
     * The path to the file that contains the jsondata to this InsightFile. is empty when the current InsightFile Object
     * was not saved yet.
     */
    filePath: string = "";
}

/**
 * This class is the main root object for the state of the app (see the State definition in store/state.ts).
 * It contains all the data that is represented directly or indirectly by the Vue View. 
 */
export class InsightFile {

    /**
     * The list of views. In the Moment this are only Workspaces but this can be extendes by implementing the View class.
     * Each View is represented by a Tab in the View.
     */
    @Type(() => Activity, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'type',
            subTypes: [
                { value: Workspace, name: 'workspace' }
            ],
        },
    })
    views: Array<Activity> = [new Workspace("Default").setActive(true)];
    
    // Some settings paramenters
    settings: InsightFileSettings = new InsightFileSettings();

    /**
     * This is called when the InsightFile is loaded from a json string. Some parts of the data structure can not be
     * saved and restored from a json string, for example references to the parent object in a tree structure. So all
     * required Objects in our data structure getting an initAfterLoading() call so setup these missing parts. 
     */
    public initAfterLoading() {
        for (let i = 0; i < this.views.length; i++) {
            const v = this.views[i];
            v.initAfterLoading();
        }
    }
}
