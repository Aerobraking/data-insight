import { ElementDimension } from "@/core/utils/ResizeUtils";
import { Exclude, Expose } from "class-transformer";

export default class AbstractWorkspaceEntry {

    constructor(entryType: string, isResizable: boolean) {
        this.id = Math.floor(Math.random() * 1000000000000);
        this.isResizable = isResizable;
        this.entryType = entryType;
        this.typeNameReadable = this.entryType.replaceAll("wsentry", "");
        this.typeNameReadable = this.typeNameReadable.charAt(0).toUpperCase() + this.typeNameReadable.slice(1);
    }

    @Expose({ name: 'o' })
    order: number = 0;

    @Expose({ name: 'tn' })
    readonly typeNameReadable: string = "";

    @Expose({ name: 'et' })
    readonly entryType: string = "";

    @Expose({ name: 'dn' })
    displayname: string = "";

    @Expose({ name: 'dr' })
    displaynameResize: boolean = true;

    @Expose({ name: 'ds' })
    displaynameShow: boolean = true;

    id: number = 0;
    x: number = 0;
    y: number = 0;

    @Expose({ name: 'w' })
    width: number = 100;

    @Expose({ name: 'h' })
    height: number = 100;

    @Expose({ name: 'r' })
    isResizable: boolean = false;

    @Exclude()
    alert: string | undefined;

    @Exclude()
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
