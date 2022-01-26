import { ElementDimension, set3DPosition, setSize } from "@/utils/resize";
import { IframeOutline } from "mdue";
import _ from "underscore";
import Plugin, { PluginDecorator } from "../app/plugins/AbstractPlugin"

@PluginDecorator()
export default class ReArrange extends Plugin {

    shortcut: string = "alt+r";
    buttonFit: HTMLButtonElement;
    style: HTMLStyleElement;
    slider: HTMLInputElement;
    sliderColumns: HTMLInputElement;
    useMouse: boolean = false;

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
        const _this = this;

        this.sliderColumns = document.createElement("input");
        this.slider = document.createElement("input");
        this.buttonFit = document.createElement("button");
        this.buttonFit.innerHTML = "Fit";
        this.buttonFit.classList.add("button-fit");
        this.buttonFit.addEventListener("click", function () {
            _this.fitSize = !_this.fitSize;
            _this.fitElementSize();
        });
        this.style = document.createElement('style');
        this.style.textContent = `
        .slider-fit{
            color: #000;
            position: fixed;
            height: 24px;
            width: auto;
        } 
        .button-fit{
            background: #fff;
            color: #000;
            position: fixed;
            height: 24px;
            width: auto;
            padding: 5px 20px 5px 20px;
        } 
        .button-fit:hover{
           // background: #bbb;
        }
        .button-fit-active{
            background: rgb(57, 215, 255);
        }
        `;

        this.slider.classList.add("slider-fit");
        this.slider.type = "range";
        this.slider.min = "0";
        this.slider.max = "300";
        this.slider.value = "0";
        this.slider.step = "1";
        this.slider.oninput = _.throttle((ev: Event) => {
            _this.padding = Number(_this.slider.value);
            _this.fitElementSize();
        }, 33);

        this.sliderColumns.classList.add("slider-fit");
        this.sliderColumns.type = "range";
        this.sliderColumns.min = "10";
        this.sliderColumns.max = "300";
        this.sliderColumns.value = "10";
        this.sliderColumns.step = "10";
        this.sliderColumns.oninput = _.throttle((ev: Event) => {
            _this.width = Number(_this.sliderColumns.value);
            _this.fitElementSize();
        }, 33);

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

        const startCoord = { x: Infinity, y: Infinity };
        let maxWidth = 0;
        for (let index = 0; index < this.selection.length; index++) {
            const e = this.selection[index];
            let d: ElementDimension = this.workspace.getCoordinatesFromElement(e);
            let id = e.getAttribute("name");
            startCoord.x = d.x < startCoord.x ? d.x : startCoord.x;
            startCoord.y = d.y < startCoord.y ? d.y : startCoord.y;
            maxWidth += d.w;
            if (id) {
                this.hash.set(id, d);
            }
            e.style.transition = "transform 0.2s";

            if (e.classList.contains("sizefixed")) {
                this.onlyResizable = false;
            }
        }

        this.sliderColumns.max = String(maxWidth);

        if (!this.useMouse) this.mouseStart = startCoord;

        this.workspace.getUnselectedEntries().forEach(e => {
            e.classList.toggle("search-not-found", true);
        });

        this.workspace.preventInput(true);

        this.workspace.highlightSelection = false;

        this.updateview();

        setTimeout(() => {
            this.workspace.showSelection(2.5);
            setTimeout(() => {
                const pos = this.workspace.getPositionInDocument({ clientX: startCoord.x, clientY: startCoord.y });
                this.slider.style.left = `${pos.x - 50}px`;
                this.slider.style.top = `${pos.y - 50}px`;

                this.sliderColumns.style.left = `${pos.x - 50}px`;
                this.sliderColumns.style.top = `${pos.y - 80}px`;


                this.buttonFit.style.left = `${pos.x - 50}px`;
                this.buttonFit.style.top = `${pos.y}px`;
                if (!this.useMouse) {
                    document.head.append(this.style);
                    document.body.appendChild(this.buttonFit);
                    document.body.appendChild(this.slider);
                    document.body.appendChild(this.sliderColumns);
                }
            }, 400);
        }, 250);
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

        if (!this.useMouse) {
            document.head.removeChild(this.style);
            document.body.removeChild(this.slider);
            document.body.removeChild(this.sliderColumns);
            document.body.removeChild(this.buttonFit);
        }
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
            this.fitElementSize();
        }

        return true;
    }

    private fitElementSize(): void {

        this.buttonFit.classList.toggle("button-fit-active", this.fitSize);

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

        if (!this.useMouse) return true;

        if (!this.mouseStart) {
            this.mouseStart = this.workspace.getPositionInWorkspace(e);
        }

        var mCurrent = this.workspace.getPositionInWorkspace(e);

        var width = -(this.mouseStart.x - mCurrent.x);
        var height = -(this.mouseStart.y - mCurrent.y);

        this.width = width < 1 ? 1 : width;
        this.height = height < 1 ? 1 : height;
        if (this.useMouse) this.updateview();
        return true;
    }

    public setUseMouse(use: boolean) {
        this.useMouse = use;
        return this;
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
        this.slider.value = String(this.padding);
        this.updateview();
        return true;
    }

}