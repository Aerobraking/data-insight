/**
 * The abstract class for a View in the app. A View is represented by a tab
 * in the window it fills up the rest of the window space.
 * In the moment the workspace if the only implementation of the view.
 */
export default abstract class View {

    // order: number = 0; used in future for sorting of the Tabs in the View
    /**
     * A unique id for each workspace that is used for identifying at some 
     * places in the code.
     */
    id: number = 0;
    /**
     * true: the view is shown in the UI, only one workspace at a time is allowed to have 
     * this set to true
     */
    isActive: boolean = false;
    /**
     * The name that is shown in the tab.
     */
    name: string = "";
    /**
     * Identifies the implemented class for the json class loader.
     */
    type: string = "";

    public setActive(a: boolean): this {
        this.isActive = a;
        return this;
    }

    public abstract initAfterLoading(): void;
}