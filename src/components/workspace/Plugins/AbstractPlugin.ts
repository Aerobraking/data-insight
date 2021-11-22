import { WorkspaceViewIfc } from "../WorkspaceUtils";

export default abstract class {

    constructor(workspace: WorkspaceViewIfc) {
        this.workspace = workspace;
    }



    workspace: WorkspaceViewIfc;

    public abstract isModal():boolean;
    public abstract cancel():boolean;
    public abstract finish():boolean;
    public abstract keydown(e: KeyboardEvent): boolean;
    public abstract keyup(e: KeyboardEvent): boolean;
    public abstract mouseup(e: MouseEvent): boolean;
    public abstract mousedown(e: MouseEvent): boolean;
    public abstract mousedownPan(e: any): boolean;
    public abstract mousemove(e: MouseEvent): boolean;

    public dragover(e: any): boolean {
        return true;
    };
    public dragleave(e: any): boolean {
        return true;
    };

    public abstract drop(e: any): boolean;
    public abstract wheel(e: any): boolean;

}