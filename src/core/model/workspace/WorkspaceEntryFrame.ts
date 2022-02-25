import AbstractWorkspaceEntry from "./WorkspaceEntry";

export class WorkspaceEntryFrame extends AbstractWorkspaceEntry {

    public static viewid: string = "wsentryframe";
    color: string = "rgb(10,10,10)";
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