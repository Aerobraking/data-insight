import { ElementDimension, set3DPosition, setSize } from "@/core/utils/resize";
import _ from "underscore";
import AbstractPlugin, { PluginDecorator } from "@/core/plugin/AbstractPlugin"

@PluginDecorator()
export default class ReArrange extends AbstractPlugin {

    description: string = "<kbd>Alt</kbd> + <kbd>R</kbd>";
    name: string = "Rearrange Selection";
    shortcut: string = "ws r";
    checkboxFit: HTMLInputElement;
    style: HTMLStyleElement;
    div: HTMLDivElement;
    slider: HTMLInputElement;
    sliderColumns: HTMLInputElement;
    useMouse: boolean = false;

    private hash: Map<String, ElementDimension> = new Map();
    width: number = 10;
    height: number = 10;
    padding: number = 10;
    selection: HTMLElement[] = [];
    mouseStart: { x: number, y: number } = { x: 0, y: 0 };
    startPositionAverage: { x: number, y: number } = { x: 0, y: 0 };
    fitSize: boolean = false;
    onlyResizable: boolean = true;
    averageWidth: number = 0;
    ctrlDown: boolean = false;

    private getClassName(a: HTMLElement): string {
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

        this.div = document.createElement("div");
        this.div.classList.add("descr");
        this.div.innerHTML = `
        <table>
        <tr>
            <td> <kbd>Ctrl</kbd> + <kbd>Mouse</kbd></td>
            <td>Columns</td>
        </tr>
        <tr>     
            <td><kbd>Mouse Wheel</kbd></td>
            <td>Padding</td>
        </tr>
        <tr>
            <td><kbd>F</kbd></td>
            <td>Normalize Size</td>
        </tr>
        </table>
        `.trim();

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
            .descr {
                color: #fff;
                position: fixed;   
                text-align: right;

               
            }
            .descr tr {
                padding: 0;
                line-height: 11px;
            }
            .descr td {
                padding: 0;
            }
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

        this.slider.classList.add("slider-fit");
        this.slider.type = "range";
        this.slider.min = "0";
        this.slider.max = "1000";
        this.slider.value = "0";
        this.slider.step = "1";
        this.slider.tabIndex = -1;
        this.slider.oninput = _.throttle((ev: Event) => {
            if (!_this.useMouse) {
                _this.padding = Number(_this.slider.value);
                _this.fitElementSize();
            }
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
            if (!_this.useMouse) {
                _this.width = Number(_this.sliderColumns.value);
                _this.fitElementSize();
            }
            _this.sliderColumns.blur();
        }, 33);

    }

    public init(): void {
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
        this.sliderColumns.value = String(maxWidth / 2);
        if (!this.useMouse) this.width = maxWidth / 2;

        this.mouseStart = this.useMouse ? this.workspace.getLastMousePosition() : startCoord;
        this.startPositionAverage = startCoord;

        this.workspace.getUnselectedEntries().forEach(e => {
            e.classList.toggle("search-not-found", true);
        });

        this.workspace.preventInput(true);

        this.workspace.showSelectionHighlighting = false;
        this.workspace.showNearbySelection = false;

        this.updateview();

        if (!this.useMouse) {
            setTimeout(() => {
                this.workspace.showSelection(2.5);
                setTimeout(() => {
                    const pos = this.workspace.getPositionInDocument({ clientX: startCoord.x, clientY: startCoord.y });
                    this.slider.style.left = `${pos.x - 50}px`;
                    this.slider.style.top = `${pos.y - 30}px`;

                    this.sliderColumns.style.left = `${pos.x - 50}px`;
                    this.sliderColumns.style.top = `${pos.y - 60}px`;

                    this.div.style.left = `${pos.x - 50 - 260}px`;
                    this.div.style.top = `${pos.y - 62}px`;

                    this.checkboxFit.style.left = `${pos.x - 50}px`;
                    this.checkboxFit.style.top = `${pos.y}px`;

                    document.head.append(this.style);
                    document.body.append(this.div, this.checkboxFit,
                        this.slider, this.sliderColumns,
                    );
                }, 650);
            }, 200);
        } else {
            this.updateview();
        }
    }

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
            [this.slider, this.sliderColumns, this.checkboxFit, this.div].forEach(e => document.body.removeChild(e));
        }
        this.workspace.preventInput(false);
        this.workspace.showSelectionHighlighting = true;
        this.workspace.showNearbySelection = true;

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

        this.ctrlDown = e.ctrlKey;

        if (this.onlyResizable && e.key == "f") {
            this.fitSize = !this.fitSize;
            this.checkboxFit.checked = this.fitSize;
            this.fitElementSize();
        }

        this.fitElementSize();

        return true;
    }

    public keyup(e: KeyboardEvent): boolean {

        this.ctrlDown = e.ctrlKey;

        this.fitElementSize();

        if (e.key == "Enter") {
            this.workspace.finishPlugin();
        }
        return true;
    }

    public mousedown(e: MouseEvent): boolean {
        this.workspace.finishPlugin();
        return true;
    }

    public mousemove(e: MouseEvent): boolean {

        if (!(this.ctrlDown || this.useMouse)) return true;

        var mCurrent = this.workspace.getPositionInWorkspace(e);

        var width = -(this.mouseStart.x - mCurrent.x);
        var height = -(this.mouseStart.y - mCurrent.y);

        this.width = width < 1 ? 1 : width;
        this.height = height < 1 ? 1 : height;

        this.sliderColumns.value = String(this.width);

        this.updateview();
        return true;
    }

    public setUseMouse(use: boolean) {
        this.useMouse = use;
        return this;
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

    public updateview() {

        const mouseStartUse: { x: number, y: number } = this.ctrlDown || this.useMouse ? this.mouseStart : this.startPositionAverage;

        let padding = this.padding;

        if (this.fitSize) {

            let columnCount = Math.max(Math.round(this.width / this.averageWidth), 1);

            let columnHeight: number[] = Array(columnCount).fill(0);

            for (let index = 0, xCurrent = mouseStartUse.x, columnCurrent = 0, yCurrent = mouseStartUse.y; index < this.selection.length; index++) {
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
            for (let index = 0, widthCurrent = 0, heightRow = 0, heightCurrent = 0, xCurrent = mouseStartUse.x, yCurrent = mouseStartUse.y; index < this.selection.length; index++) {
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

    public wheel(e: any): boolean {
        this.padding += e.deltaY / 10;
        this.padding = this.padding < 0 ? 0 : this.padding;
        this.slider.value = String(this.padding);
        this.updateview();
        return true;
    }

    public drop(e: any): boolean { return true; }
    public dragover(e: any): boolean { return true; }
    public dragleave(e: any): boolean { return true; }
    public isModal(): boolean { return true; }
    public mouseup(e: MouseEvent): boolean { return true; }
    public mousedownPan(e: any): boolean { return true; }

}