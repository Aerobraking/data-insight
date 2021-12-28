import { ElementDimension, set3DPosition, setSize } from "@/utils/resize";
import Plugin, { PluginDecorator } from "./AbstractPlugin"

@PluginDecorator()
export default class ReArrange extends Plugin {

    shortcut: string = "alt+r";

    getClassName(a: HTMLElement): string {
        let classNameA = "";
        search:
        for (let index = 0; index < a.classList.length; index++) {
            const c = a.classList[index];
            if (c.startsWith("ws-entry-")) {
                classNameA = c.replaceAll("ws-entry-", "").replaceAll("-wrapper", "");
                break search;
            }
        }
        return classNameA;
    }

    constructor() {
        super();
    }

    public init(): void {
        this.mouseStart = undefined;
        this.selection = this.workspace.getSelectedEntries();

        this.selection = this.selection.sort(function (a: HTMLElement, b: HTMLElement) {
            let classNameA = "", classNameB = "";

            search:
            for (let index = 0; index < a.classList.length; index++) {
                const c = a.classList[index];
                if (c.startsWith("ws-entry-")) {
                    classNameA = c.replaceAll("ws-entry-", "").replaceAll("-wrapper", "");
                    break search;
                }
            }
            search:
            for (let index = 0; index < b.classList.length; index++) {
                const c = b.classList[index];
                if (c.startsWith("ws-entry-")) {
                    classNameB = c.replaceAll("ws-entry-", "").replaceAll("-wrapper", "");
                    break search;
                }
            }

            if (classNameA < classNameB) { return -1; }
            if (classNameA > classNameB) { return 1; }
            return 0;

        });

        for (let index = 0; index < this.selection.length; index++) {
            const e = this.selection[index];
            let d: ElementDimension = this.workspace.getCoordinatesFromElement(e);
            let id = e.getAttribute("name");
            if (id) {
                this.hash.set(id, d);
            }
            e.style.transition = "transform 0.2s";

            if (e.classList.contains("sizefixed")) {
                this.onlyResizable = false;
            }
        }

        this.workspace.getUnselectedEntries().forEach(e => {
            e.classList.toggle("search-not-found", true);
        });

        this.workspace.preventInput(true);
        this.workspace.highlightSelection = false;
    }

    private hash: Map<String, ElementDimension> = new Map();
    width: number = 10;
    height: number = 10;
    padding: number = 10;
    selection: HTMLElement[] = [];
    mouseStart: { x: number, y: number } | undefined;
    fitSize: boolean = false;
    onlyResizable: boolean = true;
    averageWidth: number = 0;

    public isModal(): boolean { return true; }

    public cancel(): boolean {

        for (let index = 0; index < this.selection.length; index++) {
            const e = this.selection[index];

            let id = e.getAttribute("name");
            if (id) {
                let d: ElementDimension | undefined = this.hash.get(id);
                if (d) {
                    set3DPosition(e, d.x, d.y);
                    setSize(e, d.w, d.h);
                }
            }
        }

        this.finish();
        return true;

    }

    public finish(): boolean {
        this.workspace.preventInput(false);
        this.workspace.highlightSelection = true;

        setTimeout(() => {
            for (let index = 0; index < this.selection.length; index++) {
                const e = this.selection[index];
                e.style.removeProperty("transition");
            }
        }, 500);

        this.workspace.getUnselectedEntries().forEach(e => {
            e.classList.toggle("search-not-found", false);
        });

        this.workspace.updateSelectionWrapper();
        return true;
    }

    public keydown(e: KeyboardEvent): boolean {


        if (this.onlyResizable && e.key == "f") {
            this.fitSize = !this.fitSize;
            console.log(this.onlyResizable, this.fitSize);
            this.fitElementSize();
        }

        return true;
    }

    private fitElementSize(): void {

        if (this.fitSize) {
            /**
             * set size from the average width of all elements.
             */
            let sum = 0;
            for (let index = 0; index < this.selection.length; index++) {
                const e = this.selection[index];
                let d: ElementDimension = this.workspace.getCoordinatesFromElement(e);
                sum += d.w;
            }

            this.averageWidth = (sum / this.selection.length) || 200;

            for (let index = 0; index < this.selection.length; index++) {
                const e = this.selection[index];
                let d: ElementDimension = this.workspace.getCoordinatesFromElement(e);
                setSize(e, this.averageWidth, d.h * (this.averageWidth / d.w));
            }
        } else {
            /**
             * set original size
             */
            for (let index = 0; index < this.selection.length; index++) {
                const e = this.selection[index];
                let id = e.getAttribute("name");
                if (id) {
                    let d: ElementDimension | undefined = this.hash.get(id);
                    if (d) {
                        setSize(e, d.w, d.h);
                    }
                }
            }
        }


        this.updateview();

    }

    public keyup(e: KeyboardEvent): boolean {
        if (e.key == "Enter") {
            this.workspace.finishPlugin();
        }
        return true;
    }

    public mouseup(e: MouseEvent): boolean {
        return true;
    }

    public mousedown(e: MouseEvent): boolean {
        this.workspace.finishPlugin();
        return true;
    }

    public mousedownPan(e: any): boolean {
        return true;
    }

    public mousemove(e: MouseEvent): boolean {


        if (!this.mouseStart) {
            this.mouseStart = this.workspace.getPositionInWorkspace(e);
        }

        var mCurrent = this.workspace.getPositionInWorkspace(e);

        var width = -(this.mouseStart.x - mCurrent.x);
        var height = -(this.mouseStart.y - mCurrent.y);

        this.width = width < 1 ? 1 : width;
        this.height = height < 1 ? 1 : height;
        this.updateview();
        return true;
    }

    public updateview() {

        if (!this.mouseStart) {
            return;
        }

        let padding = this.padding;


        if (this.fitSize) {

            let columnCount = Math.max(Math.round(this.width / this.averageWidth), 1);

            let columnHeight: number[] = Array(columnCount).fill(0);

            for (let index = 0, xCurrent = this.mouseStart.x, columnCurrent = 0, yCurrent = this.mouseStart.y; index < this.selection.length; index++) {
                const e = this.selection[index];
                let d: ElementDimension = this.workspace.getCoordinatesFromElement(e);


                let heightCurrent = columnHeight[columnCurrent];


                set3DPosition(e, xCurrent + columnCurrent * this.averageWidth + (padding * columnCurrent), yCurrent + heightCurrent);

                columnHeight[columnCurrent] += d.h + padding;

                columnCurrent++
                if (columnCurrent > columnCount - 1) {
                    columnCurrent = 0;
                }

                e.style.transition = "transform 0.2s";
            }
        } else {
            for (let index = 0, widthCurrent = 0, heightRow = 0, heightCurrent = 0, xCurrent = this.mouseStart.x, yCurrent = this.mouseStart.y; index < this.selection.length; index++) {
                const e = this.selection[index];
                let d: ElementDimension = this.workspace.getCoordinatesFromElement(e);

                let nextRow = index < this.selection.length - 2 && this.getClassName(e) != this.getClassName(this.selection[index + 1]);

                set3DPosition(e, xCurrent + widthCurrent, yCurrent + heightCurrent);

                widthCurrent += d.w + padding;
                heightRow = Math.max(d.h + padding, heightRow);

                if (widthCurrent > this.width || nextRow) {
                    widthCurrent = 0;
                    heightCurrent += heightRow;
                    heightRow = 0;
                }
                e.style.transition = "transform 0.2s";
            }
        }
        this.workspace.updateSelectionWrapper();
    }

    public drop(e: any): boolean {
        return true;
    }

    public wheel(e: any): boolean {
        this.padding += e.deltaY / 10;
        this.padding = this.padding < 0 ? 0 : this.padding;
        this.updateview();
        return true;
    }

}