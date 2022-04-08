import WorkspaceViewIfc from "@/core/utils/WorkspaceViewIfc";
import { Constructor } from "./Constructor";

export const RegisteredPlugins: Constructor<AbstractPlugin>[] = [];

/**
 * This Decorator has du be used on every class that extends the AbstractPlugin. Is used
 * to automatically collect all Plugins for using them in the App.
 * @param active true: The Plugin will be usable. false: The Plugin won't be usable and is not listed anywhere, like it does not exist.
 * @returns The Decorator Function
 */
export function PluginDecorator(active: boolean) {
    return function <T extends Constructor<AbstractPlugin>>(target: T) {
        if (active) RegisteredPlugins.push(target);
    };
}

export default abstract class AbstractPlugin {

    /**
     * The workspace interface will be set when the starts, so right before the init() method is called.
     */
    workspace!: WorkspaceViewIfc;

    public setWorkspace(workspace: WorkspaceViewIfc): this {
        this.workspace = workspace;
        return this;
    }

    /**
     * The name will be used for uniquely identify each Plugin. Is Shown in the Help Dialog of the App.
     */
    readonly abstract name: string;

    /**
     * The Description will be shown in the "Help" Dialog of the App, next to the Name. Should contain the Shortcut in a human readable form. 
     */
    readonly abstract description: string;


    /**
     * 
     */
    readonly abstract shortcut: string;

    /**
     * Defines where the Plugin can be started with its keyboard shortcut.
     * ws: Workspace
     * ov: Overview
     * gl: Global, so everywhere in the App.
     */
    readonly abstract domain: "ws" | "ov" | "gl";

    public abstract isModal(): boolean;

    /**
     * Is called when the Plugin starts.
     */
    public abstract init(): void;

    /**
    * Is called when the Plugin should cancel it current action. Is only called after the init() call
    * and before finish() was called
    */
    public abstract cancel(): boolean;

    /**
     * Call this to end the Plugin. Call this only when the Plugin is active because of an init() before. 
     */
    public abstract finish(): boolean;

    /**
     * All Input Events from the view will be dispatched to the Plugin for using them. 
     * @returns true: Stops the Propagation of the Event in the View where it was dispatched from. false: The Event will be processed normally in the UI
     * after it was processed here by the Plugin.
     */
    public abstract keydown(e: KeyboardEvent): boolean;
    public abstract keyup(e: KeyboardEvent): boolean;
    public abstract mousedown(e: MouseEvent): boolean;
    public abstract mousemove(e: MouseEvent): boolean;
    public abstract mouseup(e: MouseEvent): boolean;
    public abstract mousedownPan(e: any): boolean;
    public abstract wheel(e: any): boolean;
    public abstract dragover(e: any): boolean;
    public abstract dragleave(e: any): boolean;
    public abstract drop(e: any): boolean;

}

/**
 * A abstract class that implements the AbstractPlugin class
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