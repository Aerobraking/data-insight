import { Exclude } from "class-transformer";
import AbstractWorkspaceEntry from "./WorkspaceEntry";

/**
 * Represents a simple resizable rectangle in the WorkspaceView. Can be used
 * to group other WorkspaceEntries.
 */
export class WorkspaceEntryFrame extends AbstractWorkspaceEntry {

    public static viewid: string = "wsentryframe";

    /**
     * The color of the frame. Should be made editable in the future.
     */
    color: string = "rgb(10,10,10)";

    @Exclude()
    readonly typeNameReadable: string = "Frame";

    /**
     * Disable making it selectable by clicking on it because this can be irritating when
     * the user tries to select other entries inside the frame.
     */
    readonly isInsideSelectable: boolean = false;

    constructor() {
        super("wsentryframe", true);
        this.width = 1400;
        this.height = 1400;
    }

    public searchResultString(): string {
        return "Found inside Name";
    }

}