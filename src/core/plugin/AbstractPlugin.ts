import WorkspaceViewIfc from "@/core/utils/WorkspaceViewIfc";
import { Constructor } from "./Constructor";

export const RegisteredPlugins: Constructor<AbstractPlugin>[] = [];

export function PluginDecorator(active: boolean) {
    return function <T extends Constructor<AbstractPlugin>>(target: T) {
        if (active) RegisteredPlugins.push(target);
    };
}

export default abstract class AbstractPlugin {

    workspace!: WorkspaceViewIfc;

    public setWorkspace(workspace: WorkspaceViewIfc): this {
        this.workspace = workspace;
        return this;
    }

    readonly abstract description: string;
    readonly abstract name: string;
    readonly abstract shortcut: string;

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
    public abstract dragover(e: any): boolean;
    public abstract dragleave(e: any): boolean;

}

/**
 * A abstract class that implements the AbstractPlugin 
 * and most of its methods which you can use when you only 
 * want to implement some specific methods. Keeps stuff more simple.
 */
export abstract class PluginAdapter extends AbstractPlugin {

    public cancel(): boolean {
        return true;
    }

    public finish(): boolean {
        return true;
    }
    public isModal(): boolean {
        return true;
    }

    public keydown(e: KeyboardEvent): boolean {
        return true;
    }

    public keyup(e: KeyboardEvent): boolean {
        return true;
    }

    public mouseup(e: MouseEvent): boolean {
        return true;
    }

    public mousedown(e: MouseEvent): boolean {
        return true;
    }

    public mousedownPan(e: any): boolean {
        return true;
    }

    public mousemove(e: MouseEvent): boolean {
        return true;
    }

    public drop(e: any): boolean {
        return true;
    }

    public wheel(e: any): boolean {
        return true;
    }
    public dragover(e: any): boolean {
        return true;
    };
    public dragleave(e: any): boolean {
        return true;
    };
}