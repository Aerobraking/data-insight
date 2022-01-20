import { ElementDimension } from "@/utils/resize";
import { Exclude } from "class-transformer";

export default class WorkspaceEntry {
    constructor(componentname: string, isResizable: boolean) {
        this.id = Math.floor(Math.random() * 1000000000000);
        this.isResizable = isResizable;
        this.componentname = componentname;
        this.typename = this.componentname.replaceAll("wsentry", "");
        this.typename = this.typename.charAt(0).toUpperCase() + this.typename.slice(1);
    }

    order: number = 0;
    typename: string = "";
    componentname: string = "";
    displayname: string = "";
    displaynameResize: boolean = false;
    showDisplayname: boolean = true;
    x: number = 0;
    y: number = 0;
    id: number = 0;
    isSelected: boolean = false;
    isResizable: boolean = false;
    width: number = 220;
    height: number = 180;
    @Exclude()
    alert: string | undefined;
    readonly isInsideSelectable: boolean = true;

    public setDimensions(d: ElementDimension) {
        this.x = d.x;
        this.y = d.y;
        if (this.isResizable) {
            this.width = d.w;
            this.height = d.h;
        }
    }

    public searchResultString(): string {
        return " - ";
    }

    public searchLogic(input: string): boolean {
        return this.displayname.toLowerCase().includes(input.toLocaleLowerCase());
    }

    public getFilesForDragging(): string[] {
        return [];
    }
}
