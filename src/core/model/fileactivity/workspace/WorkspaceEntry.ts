import { ElementDimension } from "@/core/utils/ResizeUtils";
import { Exclude, Expose } from "class-transformer";

/**
 * This is the base class for all WorkspaceEntry Implementations.
 * It requires a unique type name through the constructor call and offers
 * some methods you can overwrite to offer more functionality for the search
 * in the app and other things. 
 */
export default abstract class AbstractWorkspaceEntry {

    constructor(entryType: `wsentry${string}`, isResizable: boolean = true) {
        this.isResizable = isResizable;
        this.entryType = entryType;
    }

    // a unique ID for identifying an entry inside a workspace
    id: number = 0;

    /**
     * true: this WorkspaceEntry (hence its View the HTMLDIVElement) is resizable by the user.
     * false: It is not resizable and uses only the dimension that are set in the class.
     */
    @Expose({ name: 'r' })
    isResizable: boolean = false;

    /**
     * A unique string that describes the WorkspaceEntry Implementation. It has to be the same
     * string that is used for the name of the Vue Component for this Entry.
     */
    @Expose({ name: 'et' })
    readonly entryType: string = "";

    // x and y position in the workspace
    private _x: number = 0; public get x(): number {
        return this._x;
    }
    public set x(value: number) {
        this._x = value;
    }
    private _y: number = 0;
    public get y(): number {
        return this._y;
    }
    public set y(value: number) {
        this._y = value;
    }

    // width of the div element that contains the component for this entry 
    @Expose({ name: 'w' })
    width: number = 100;

    // height of the div element that contains the component for this entry
    @Expose({ name: 'h' })
    height: number = 100;

    /**
     * Not used in the moment. Should be used for sorting the entries in the workspace
     * in a specific order to define which entry is in the foreground.
     */
    @Expose({ name: 'or' })
    order: number = 0;

    /**
     * A human readable string that describes the WorkspaceEntry. Is created from the entryType string
     * that is passed to the constructor. 
     */
    @Exclude()
    abstract readonly typeNameReadable: string;

    /**
     * The User can add a custom name to each Entry in the View, that is stored here.
     */
    @Expose({ name: 'dn' })
    displayname: string = "";

    /**
     * true: The displayname is always the same size in the WorkspaceView, no matter of the scale factor of the
     * viewport transformation
     * false: The displayname has a fixed size which scales according to the sacle factor of the viewport 
     * transformation, like all other elements in the WorkspaceView.
     */
    @Expose({ name: 'dr' })
    displaynameResize: boolean = true;

    /**
     * true: The displayname is shown in the WorkspaceView
     * false: The displayname is hidden in the WorkspaceView.
     */
    @Expose({ name: 'ds' })
    displaynameShow: boolean = true;

    /**
     * When this string is NOT undefinied, are warning icon is shown right beside the WorkspaceEntry View.
     * The icon shows this alert string when the user clicks/hovers over it.
     */
    @Exclude()
    alert: string | undefined;

    /**
     * true: In the WorkspaceView the Entry is selectable when the user clicks inside of the Entry View.
     * false: The Entry is not selectable when the user clicks inside of its View.
     */
    @Exclude()
    readonly isInsideSelectable: boolean = true;

    public setDimensions(d: ElementDimension) {
        this.x = d.x, this.y = d.y;
        if (this.isResizable) this.width = d.w, this.height = d.h;
    }

    /**
     * When the searchLogic() method returns true, so this entry fits to the current search,
     * this method returns the text that is shown for this entry in the search results.
     * @returns The message that is shown in the search result list for this Entry.
     */
    public searchResultString(): string {
        return " - ";
    }

    /**
     * By default this method tests if the search string is includes in the displayname of this Entry.
     * @param input the search string
     * @returns true: Entry fits to the search string, false: Entry does NOT fit to the search string.
     */
    public searchLogic(input: string): boolean {
        return this.displayname.toLowerCase().includes(input.toLocaleLowerCase());
    }

    /**
     * When the user starts a file dragging of the current selection in the workspace, each selected
     * entry can return the files it wants to be dragged here.
     * @returns List of file paths, that should be dragged.
     */
    public getFilesForDragging(): string[] {
        return [];
    }
}


export class DefaultWorkspaceEntry extends AbstractWorkspaceEntry {

    @Exclude()
    readonly typeNameReadable: string = "";

}