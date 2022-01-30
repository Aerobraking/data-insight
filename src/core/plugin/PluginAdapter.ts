import AbstractPlugin from "./AbstractPlugin";

export abstract class PluginAdapter extends AbstractPlugin {

    abstract shortcut: string;

    constructor() {
        super();
    }

    public init(): void { }
    public cancel(): boolean { return true; }
    public finish(): boolean { return true; }

    public isModal(): boolean { return true; }

    public keydown(e: KeyboardEvent): boolean { return true; }
    public keyup(e: KeyboardEvent): boolean { return true; }
    public mouseup(e: MouseEvent): boolean { return true; }
    public mousedown(e: MouseEvent): boolean { return true; }
    public mousedownPan(e: any): boolean { return true; }
    public mousemove(e: MouseEvent): boolean { return true; }
    public wheel(e: any): boolean { return true; }
    public drop(e: any): boolean { return true; }

}