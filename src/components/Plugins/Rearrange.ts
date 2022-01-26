import { ElementDimension, set3DPosition, setSize } from "@/utils/resize";
import { IframeOutline } from "mdue";
import _ from "underscore";
import Plugin, { PluginDecorator } from "../app/plugins/AbstractPlugin"

@PluginDecorator()
export default class ReArrange extends Plugin {

    shortcut: string = "alt+r";
    checkboxFit: HTMLInputElement;
    style: HTMLStyleElement;
    span1: HTMLSpanElement;
    span2: HTMLSpanElement;
    span3: HTMLSpanElement;
    slider: HTMLInputElement;
    sliderColumns: HTMLInputElement;
    useMouse: boolean = false;

    private hash: Map<String, ElementDimension> = new Map();
    width: number = 10;
    height: number = 10;
    padding: number = 10;
    selection: HTMLElement[] = [];
    mouseStart: { x: number, y: number } | undefined;
    fitSize: boolean = false;
    onlyResizable: boolean = true;
    averageWidth: number = 0;

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
        this.checkboxFit = document.createElement("input");
        this.span1 = document.createElement("span");
        this.span2 = document.createElement("span");
        this.span3 = document.createElement("span");

        this.checkboxFit.type = "checkbox";
        this.checkboxFit.classList.add("checkbox-fit");
        this.checkboxFit.tabIndex = -1;
        this.checkboxFit.addEventListener("change", function () {
            _this.fitSize = _this.checkboxFit.checked;
            _this.fitElementSize();
            _this.checkboxFit.blur();
        });
        this.style = document.createElement('style');
        this.style.textContent = `
            .slider-fit{
                color: #000;
                position: fixed;
                height: 24px;
                width: auto;
            } 
            span {
                text-align: right;
                width: 200px;
                position: fixed;
                color: #fff;
            }
            .checkbox-fit{
                position: fixed; 
            } 
            .button-fit:hover{
            // background: #bbb;
            }
            .button-fit-active{
                background: rgb(57, 215, 255);
            }
        `;

        this.span1.innerHTML = "<kbd>Mouse Wheel</kbd> Padding";
        this.span2.innerHTML = "<kbd>Ctrl</kbd> + <kbd>Mouse</kbd> Columns";
        this.span3.innerHTML = "<kbd>F</kbd> Normalize Size";

        this.slider.classList.add("slider-fit");
        this.slider.type = "range";
        this.slider.min = "0";
        this.slider.max = "300";
        this.slider.value = "0";
        this.slider.step = "1";
        this.slider.tabIndex = -1;
        this.slider.oninput = _.throttle((ev: Event) => {
            _this.padding = Number(_this.slider.value);
            _this.fitElementSize();
            _this.slider.blur();
        }, 33);

        this.sliderColumns.classList.add("slider-fit");
        this.sliderColumns.type = "range";
        this.sliderColumns.min = "10";
        this.sliderColumns.max = "300";
        this.sliderColumns.value = "10";
        this.sliderColumns.step = "10";
        this.sliderColumns.tabIndex = -1;
        this.sliderColumns.oninput = _.throttle((ev: Event) => {
            _this.width = Number(_this.sliderColumns.value);
            _this.fitElementSize();
            _this.sliderColumns.blur();
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

        if (!this.useMouse) {
            setTimeout(() => {
                this.workspace.showSelection(2.5);
                setTimeout(() => {
                    const pos = this.workspace.getPositionInDocument({ clientX: startCoord.x, clientY: startCoord.y });
                    this.slider.style.left = `${pos.x - 50}px`;
                    this.slider.style.top = `${pos.y - 30}px`;
                    this.span1.style.left = `${pos.x - 50 - 210}px`;
                    this.span1.style.top = `${pos.y - 30}px`;

                    this.sliderColumns.style.left = `${pos.x - 50}px`;
                    this.sliderColumns.style.top = `${pos.y - 60}px`;
                    this.span2.style.left = `${pos.x - 50 - 210}px`;
                    this.span2.style.top = `${pos.y - 60}px`;


                    this.checkboxFit.style.left = `${pos.x - 50}px`;
                    this.checkboxFit.style.top = `${pos.y}px`;
                    this.span3.style.left = `${pos.x - 50 - 210}px`;
                    this.span3.style.top = `${pos.y}px`;


                    document.head.append(this.style);
                    document.body.append(this.checkboxFit,
                        this.slider, this.sliderColumns,
                        this.span1, this.span2, this.span3);

                }, 650);
            }, 200);
        } else {
            this.mouseStart = this.workspace.getLastMousePosition();
            this.updateview();
        }
    }

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
            [this.slider, this.sliderColumns, this.checkboxFit,
            this.span1, this.span2, this.span3].forEach(e => document.body.removeChild(e));
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

        this.updateview();
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