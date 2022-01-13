import WorkspaceViewIfc from "../WorkspaceViewIfc";
import { Constructor } from "./Constructor";
  
export const RegisteredPlugins: Constructor<AbstractPlugin>[] = [];
export function PluginDecorator() {
    return function <T extends Constructor<AbstractPlugin>>(target: T) {
        RegisteredPlugins.push(target);
    };
}

export default abstract class AbstractPlugin {

    constructor() {
    }

    // @ts-ignore: Unreachable code error
    workspace: WorkspaceViewIfc;

    public setWorkspace(workspace: WorkspaceViewIfc): this {
        this.workspace = workspace;
        return this;
    }

    abstract shortcut: string;

    // 
    public abstract isModal(): boolean;
    public abstract init(): void;
    public abstract cancel(): boolean;
    public abstract finish(): boolean;

    public abstract keydown(e: KeyboardEvent): boolean;
    public abstract keyup(e: KeyboardEvent): boolean;
    public abstract mousedown(e: MouseEvent): boolean;
    public abstract mouseup(e: MouseEvent): boolean;
    public abstract mousedownPan(e: any): boolean;
    public abstract mousemove(e: MouseEvent): boolean;
    public abstract wheel(e: any): boolean;
    public abstract drop(e: any): boolean;

    public dragover(e: any): boolean {
        return true;
    };
    public dragleave(e: any): boolean {
        return true;
    };



}