
import { Overview } from "@/store/model/OverviewDataModel";
import { ElementDimensionInstance } from "@/utils/resize";
import { Exclude, Type } from "class-transformer";
import * as d3 from "d3";
import {
    ForceCenter,
    ForceLink,
    Simulation,
    SimulationLinkDatum,
    SimulationNodeDatum,
    ZoomTransform,
} from "d3";
import { FolderNode } from "./FileEngine";
import { AbstractNode, AbstractOverviewEntry, AbstractLink, EntryListener, ColumnTextWidth } from "./OverviewData";
import ColorTracker from 'canvas-color-tracker';
import _ from "underscore";
import { EntryCollection } from "@/store/model/Workspace";
import TWEEN from "@tweenjs/tween.js";
import { Tween } from "@tweenjs/tween.js";

/**
 * Wir brauchen einen "Server" im Hintergrund die nach änderungen für alle Subtrees sucht.
 * Außerdem muss man einen neuen Subtree erstellen und hinzufügen können. 
 * Dieser wird dann gescannt und seine childnodes nach und nach hinzugefügt. 
 * (da könnte man vll erst alles einlesen, hinzufügen und dann erst zum syncen hinzufügen)
 * 
 * Im Vordergrund kümmert sich unsere Engine um das bewegen der nodes. Sie bekommt dann nur die 
 * entsprechenden Updates vom Server
 * 
 * Und als drittes brauchen wir code zum darstellen und interagieren. Der wäre für alle implementierungen 
 * eigentlich gleich. Es sind dann eher die Node Subklassen, die andere Eigenschaften nutzen könnten.
 * Da würde es wohl reichen einfach ein System zu erstellen, dass leicht neue Anzeigemöglichkeiten anhand eines
 * props zu erstellen (size, age, number of files, etc.)
 * 
 * 
 * Wir haben das "problem" dass wir einmal
 * -    die daten, die müssen speicherbar sein
 * -    der watcher der änderungen beobachtet und die daten anpassen muss, dabei sollten nodes nach und nach
 *      hinzugefügt werden, damit der thread nicht zu lange blockiert wird
 * -    die simulation, die simuliert und evtl. auf Änderungen in der daten reagieren muss (watch tiefe)
 * -    der render, der alle daten haben muss, das ist bisher glaub unproblematisch 
 * 
 */

enum BackgroundBehaviour {
    NORMAL,
    SLOWDOWN,
    PAUSE,
}

export class EngineState {

    constructor() {

    }

    showLeafs: boolean = true;
    engineActive: boolean = false;
    backgroundBehaviour: BackgroundBehaviour = BackgroundBehaviour.NORMAL;
}

export class OverviewEngine implements EntryListener<AbstractNode>{


    showShadowCanvas(show: boolean) {
        this.showShadow = show;
        // d3.select(this.canvas).style("display", show ? "none" : "block");
        // d3.select(this.canvasShadow).style("display", show ? "block" : "none");
    }

    constructor(div: HTMLElement, state: EngineState, overview: Overview) {

        var _this = this;

        this.overview = overview;
        this.state = state

        let c = d3
            .select(div)
            .append("canvas")
            .attr("width", div.clientWidth)
            .attr("height", div.clientHeight)
            .attr("class", "overview-canvas")
            .node();

        if (c) {
            this.canvas = c;
        } else {
            this.canvas = new HTMLCanvasElement();
        }

        let context = this.canvas.getContext("2d");
        this.context = context ? context : new CanvasRenderingContext2D();

        let cShadow = d3
            .select(div)
            .append("canvas")
            .attr("width", div.clientWidth)
            .attr("height", div.clientHeight)
            .attr("class", "overview-canvas-shadow")
            .style("display", "none")
            .node();

        if (cShadow) {
            this.canvasShadow = cShadow;
        } else {
            this.canvasShadow = new HTMLCanvasElement();
        }

        context = this.canvasShadow.getContext("2d");
        this.contextShadow = context ? context : new CanvasRenderingContext2D();
        this.size = new ElementDimensionInstance(0, 0, 1, 1);

        /**
         * Listen for resizing of the canvas parent element
         */
        this.divObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
            for (let index = 0; index < entries.length; index++) {
                const e = entries[index];
                e.target; // div element
                let w = Math.max(10, e.contentRect.width);
                let h = Math.max(10, e.contentRect.height);
                this.canvas.width = w;
                this.canvas.height = h;
                this.canvasShadow.width = w;
                this.canvasShadow.height = h;

                this.size.w = w;
                this.size.h = h;
                _this.tick();
            }
        });
        this.divObserver.observe(div);

        let throttle = _.throttle(() => {
            const pxScale = window.devicePixelRatio;
            if (_this.mousePosition.x > 0 && _this.mousePosition.y > 0) {
                const px: any = (_this.mousePosition.x > 0 && _this.mousePosition.y > 0)
                    ? _this.contextShadow.getImageData(_this.mousePosition.x * pxScale, _this.mousePosition.y * pxScale, 1, 1)
                    : null;
                _this.nodeHovered = this.getNodeAtMousePosition();
            }
        }, 80);

        // Setup node drag interaction
        d3.select(this.canvas).on("mousemove", function (e: MouseEvent) {
            var rect = _this.canvas.getBoundingClientRect();
            _this.mousePosition = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            throttle();
        })
            .call(
                d3.drag<HTMLCanvasElement, unknown>().subject(() => {
                    const obj = this.getNodeAtMousePosition();
                    return obj; // Only drag nodes
                })
                    .on('start', ev => {
                        const obj = ev.subject;
                        obj.__initialDragPos = { x: obj.x, y: obj.y, fx: obj.fx, fy: obj.fy };
                        const node = ev.subject as AbstractNode;

                        if (!node.parent) {
                            if (node.entry) {
                                node.entry.isSimulationActive = false;
                            }
                            let children = node.descendants(false);
                            for (let i = 0; i < children.length; i++) {
                                const child: any = children[i];
                                child.__initialDragPos = { x: child.x, y: child.y, fx: child.fx, fy: child.fy };
                                if (!ev.active) {
                                    child.fy = child.y; // Fix points
                                }
                            }
                        }


                        // keep engine running at low intensity throughout drag
                        if (!ev.active) {
                            obj.fx = obj.x; obj.fy = obj.y; // Fix points
                        }

                        this.canvas.classList.add('grabbable');
                    })
                    .on('drag', ev => {
                        const obj = ev.subject;
                        const node = ev.subject as AbstractNode;
                        const initPos = obj.__initialDragPos;
                        const dragPos = ev;

                        const k = d3.zoomTransform(this.canvas).k;

                        let diffX = (dragPos.x - initPos.x) / k;
                        let diffY = (dragPos.y - initPos.y) / k;

                        if (!node.parent) {
                            /**
                             * the root can be moved in any direction and moves the whole tree with it
                             */
                            obj.fx = obj.x = initPos.x + diffX;
                            obj.fy = obj.y = initPos.y + diffY;

                            let children = node.descendants(false);
                            for (let i = 0; i < children.length; i++) {
                                const child: any = children[i];
                                const childInitPos = child.__initialDragPos;
                                child.fy = child.y = childInitPos.y + diffY;
                            }

                        } else {
                            /**
                             * A non root node is bound to its X column position, so we only allow vertical movement and 
                             * a small X movement for user feedback.
                             */
                            obj.fx = obj.x = initPos.x + diffX * 0.1;
                            obj.fy = obj.y = initPos.y + diffY;
                        }

                        // prevent freeze while dragging
                        node.entry?.simulation
                            .alphaTarget(0.3) // keep engine running at low intensity throughout drag
                            .restart();  // prevent freeze while dragging

                    })
                    .on('end', ev => {

                        const obj = ev.subject;
                        const node = ev.subject as AbstractNode;
                        const initPos = obj.__initialDragPos;
                        if (node.entry) {
                            node.entry.isSimulationActive = true;
                        }
                        if (initPos.fx === undefined) { obj.fx = undefined; }
                        if (initPos.fy === undefined) { obj.fy = undefined; }
                        delete (obj.__initialDragPos);

                        if (!node.parent) {
                            let children = node.descendants(false);
                            for (let i = 0; i < children.length; i++) {
                                const child: any = children[i];
                                const childInitPos = child.__initialDragPos;
                                if (childInitPos.fx === undefined) { child.fx = undefined; }
                                if (childInitPos.fy === undefined) { child.fy = undefined; }
                                delete (child.__initialDragPos);
                            }
                        }

                        node.entry?.simulation
                            .alphaTarget(0.004) // keep engine running at low intensity throughout drag
                            .restart();

                        this.canvas.classList.remove('grabbable');
                    })
            );

        // Setup zoom / pan interaction
        this.zoom = d3.zoom<HTMLCanvasElement, HTMLCanvasElement>()
        this.zoom(d3.select(this.canvas));
        this.zoom.filter((event: MouseEvent | WheelEvent) => {
            if (event instanceof WheelEvent) {
                return true;
            } else if (event instanceof MouseEvent) {
                return (event.button === 1);
            }
            return false;
        });
        this.zoom.scaleTo(d3.select(this.canvas), this.overview.viewportTransform.scale);
        this.zoom.translateTo(d3.select(this.canvas), this.overview.viewportTransform.x, this.overview.viewportTransform.y);
        this.zoom.scaleExtent([0.1, 8]);
        this.zoom.on("zoom", (event: any, d: HTMLCanvasElement) => {
            let t = d3.zoomTransform(this.canvas);
            this.overview.viewportTransform = { x: t.x, y: t.y, scale: t.k };
        });
        let t = d3.zoomTransform(this.canvas);
    }

    getNodeAtMousePosition = () => {
        let obj = null;
        const pxScale = window.devicePixelRatio;
        const px: any = (this.mousePosition.x > 0 && this.mousePosition.y > 0)
            ? this.contextShadow.getImageData(this.mousePosition.x * pxScale, this.mousePosition.y * pxScale, 1, 1)
            : null;
        px && (obj = this.autocolor.lookup(px.data));
        return obj != null ? obj : undefined;
    };


    public graphToScreenCoords(c: MouseEvent | { x: number, y: number }) {
        const t = d3.zoomTransform(this.canvas);
        if (c instanceof MouseEvent) {
            return { x: c.clientX * t.k + t.x, y: c.clientY * t.k + t.y };
        } else {
            return { x: c.x * t.k + t.x, y: c.y * t.k + t.y };
        }
    }

    public screenToGraphCoords(c: MouseEvent | { x: number, y: number }) {
        const t = d3.zoomTransform(this.canvas);
        if (c instanceof MouseEvent) {
            return { x: (c.clientX - t.x) / t.k, y: (c.clientY - t.y) / t.k };
        } else {
            return { x: (c.x - t.x) / t.k, y: (c.y - t.y) / t.k };
        }
    }

    public destroy() {
        this.divObserver.disconnect();
    }

    mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    autocolor: ColorTracker = new ColorTracker();
    zoom: d3.ZoomBehavior<HTMLCanvasElement, HTMLCanvasElement>;
    overview: Overview;
    state: EngineState;
    size: ElementDimensionInstance;
    divObserver: ResizeObserver;
    canvas: HTMLCanvasElement;
    nodeHovered: AbstractNode | undefined;
    context: CanvasRenderingContext2D;
    contextShadow: CanvasRenderingContext2D;
    canvasShadow: HTMLCanvasElement;
    engineActive: boolean = false;
    public showShadow: boolean = true;
    private _rootNodes: any[] = [];

    nodeAdded(node: AbstractNode) {
        node.colorID = this.autocolor.register(node);

        this.updateColumns = true;
    }



    nodeUpdate() {
        /**
         * Recalculate column widths
         */
        this.updateColumns = true;
    }



    public get rootNodes(): any[] {
        return this._rootNodes;
    }

    public set rootNodes(value: any[]) {
        this._rootNodes = value;

        // register the root nodes for color ids
        for (let j = 0; j < this.rootNodes.length; j++) {
            const entry: AbstractOverviewEntry = this.rootNodes[j];
            entry.root.colorID = this.autocolor.register(entry.root);
        }

        this.updateColumns = true;
    }

    transform: ZoomTransform | undefined;

    public start(): void {
        this.tick();
        this.engineActive = true;
    }

    public tick(): void {

        if (this.engineActive) {
            for (let index = 0; index < this._rootNodes.length; index++) {
                const element = this._rootNodes[index].tick();
            }
        }

        // render the canvas
        this.drawCanvas(this.context);
        // render the shadow canvas
        this.drawCanvas(this.contextShadow, true);


        TWEEN.update();
        // request next frame
        setTimeout(() => {
            requestAnimationFrame(() => this.tick());
        }, 33);
    }



    public getColumnX(entry: AbstractOverviewEntry, n: AbstractNode) {

        let x = n.parent ? this.getColumnData(entry, n.depth).x + entry.root.getX() : n.getX();

        return x;
    }

    mapEntryColumns: Map<number, Map<number, { xTemp?: number, x: number, textWidth: number, nodeRadius: number }>> = new Map();
    setWidthsTween: Map<AbstractOverviewEntry, Map<number, Tween<any>>> = new Map();



    public getColumnData(entry: AbstractOverviewEntry, depth: number) {
        return this.getColumnDataByID(entry.id, depth);
    }

    public getColumnDataByID(id: number, depth: number) {
        let entryColumns = this.mapEntryColumns.get(id);
        if (!entryColumns) {
            entryColumns = new Map();
            this.mapEntryColumns.set(id, entryColumns);
        }
        let data = entryColumns.get(depth);
        if (!data) {
            data = { x: 0, textWidth: 100, nodeRadius: 10 };
            const dataPrev = this.getColumnDataRawByID(id, depth - 1);
            if (dataPrev) {
                data.x = dataPrev.x + dataPrev.textWidth;
            }

            entryColumns.set(depth, data);
        }
        return data;
    }


    public getColumnDataRaw(entry: AbstractOverviewEntry, depth: number) {
        return this.getColumnDataRawByID(entry.id, depth);
    }

    public getColumnDataRawByID(id: number, depth: number) {
        let entryColumns = this.mapEntryColumns.get(id);
        if (!entryColumns) {
            entryColumns = new Map();
            this.mapEntryColumns.set(id, entryColumns);
        }
        let data = entryColumns.get(depth);
        return data;
    }

    public setColumnTextWidth(entry: AbstractOverviewEntry, value: ColumnTextWidth) {
        let _this = this;
        let data = this.getColumnData(entry, value.depth);
        if (data.textWidth != value.max) {
            /**
             * the changed column gets the new width directly as itself will not visibility be changed 
             */

            data.textWidth = value.max;
            let diff = data.x;
            /**
             * Update the x coord for the following columns.
             */
            let i = value.depth + 1;
            let index = 0;
            let dataNext = this.getColumnDataRaw(entry, i);
            while (dataNext) {
                let dataPrev = this.getColumnDataRaw(entry, i - 1);
                if (dataPrev) {

                    diff += dataPrev.textWidth;

                    let entryTweenList = this.setWidthsTween.get(entry);

                    if (!entryTweenList) {
                        entryTweenList = new Map();
                    }

                    let tween = entryTweenList.get(i);
                    if (tween) {
                        tween.stop();
                    }

                    /**
                     * E:\Testdaten\Bilder\0_40kb\Neuer Ordner awdaw\Neuer Ordner\1
                     * E:\Testdaten\Bilder\0_40kb\Neuer Ordner awdaw\Neuer Ordner\1
                     *  we give the next column 
                     */
                    dataNext.xTemp = dataPrev.x + dataPrev.textWidth;
                    tween = new TWEEN.Tween({ x: dataNext.x, id: entry.id, depth: i });
                    tween.to({ x: diff }, 2000) 
                    tween.easing(TWEEN.Easing.Elastic.Out)
                    tween.delay(index*150)
                    tween.onUpdate(function (object) {
                        let d = _this.getColumnDataRawByID(object.id, object.depth);
                        if (d) {
                            d.x = object.x;
                        }
                    })
                    tween.start();
 
                    entryTweenList.set(value.depth, tween);

                }
                i++;
                index++;
                dataNext = this.getColumnDataRaw(entry, i);
            }



        }
    }

    updateColumns: boolean = true;


    private drawCanvas(ctx: CanvasRenderingContext2D, isShadow: boolean = false) {

        this.clearCanvas(ctx, this.size.w, this.size.h);

        ctx.save();
        ctx.imageSmoothingEnabled = false;


        ctx.clearRect(0, 0, this.size.w, this.size.h);
        if (!isShadow) {
            ctx.fillStyle = "rgb(100,100,110)";
            ctx.fillRect(0, 0, this.size.w, this.size.h);
        }

        ctx.fillStyle = "rgb(200,200,200)";
        this.transform = d3.zoomTransform(this.canvas);
        ctx.translate(this.transform.x, this.transform.y);
        ctx.scale(this.transform.k, this.transform.k);

        if (this.rootNodes && this.transform) {

            if (isShadow) {
                ctx.fillStyle = "rgb(240,240,240)";
                ctx.fillRect(-100, -100, 200, 200);
            }


            for (let index = 0; index < this.rootNodes.length; index++) {
                const entry: AbstractOverviewEntry = this.rootNodes[index];
                let nodes: AbstractNode[] = entry.root.descendants();

                /**
                 * Update column metrics
                 */
                if (this.updateColumns) {

                    ctx.font = `${13}px Lato`;
                    ctx.fillStyle = "#fff";

                    /**
                     * collection of all column width for the current entry
                     */
                    let setWidths: Map<number, ColumnTextWidth> = new Map();

                    for (let i = 0; i < nodes.length && !isShadow; i++) {
                        const n = nodes[i];
                        let isNodeHovered = this.nodeHovered == n;

                        let textWidth: ColumnTextWidth | undefined = setWidths.get(n.depth);

                        if (!textWidth) {
                            textWidth = { min: 10000000, max: 0, depth: n.depth };
                            setWidths.set(n.depth, textWidth);
                        }

                        let textw = ctx.measureText(n.name).width + n.getRadius() * 3 + 70;
                        textWidth.max = Math.max(textWidth.max, textw);
                        textWidth.min = Math.min(textWidth.min, textw);

                    }

                    let depths: number[] = Array.from(setWidths.keys());
                    depths.sort();

                    for (let d = 0; d < depths.length; d++) {
                        const element = setWidths.get(d);
                        if (element) {
                            this.setColumnTextWidth(entry, element);
                        }
                    }

                }

                ctx.fillStyle = "rgb(170,170,170)";

                let links: AbstractLink[] = entry.root.links();


                /**
                 *  Links
                 */
                for (let i = 0; i < links.length; i++) {
                    const n = links[i];
                    let start = n.source;
                    let end = n.target;

                    ctx.beginPath();
                    ctx.lineWidth = 1.1;

                    let xStart = this.getColumnX(entry, start);
                    let xEnd = this.getColumnX(entry, end);


                    let grd = ctx.createLinearGradient(xStart, start.getY(), xEnd, end.getY());
                    grd.addColorStop(0, "#00000000");
                    grd.addColorStop(0.1, "#00000000");
                    grd.addColorStop(0.4, "#000000ff");
                    ctx.strokeStyle = grd;

                    if (isShadow) {
                        ctx.strokeStyle = start.colorID ? start.colorID : "rgb(200,200,200)";
                    }


                    ctx.moveTo(xStart, start.getY());
                    let midX = (xStart + xEnd) / 2;
                    ctx.bezierCurveTo(
                        midX,
                        start.getY(),
                        midX,
                        end.getY(),
                        xEnd,
                        end.getY()
                    );
                    ctx.stroke();

                }

                /**
                 *  Nodes
                 */
                for (let i = 0; i < nodes.length; i++) {
                    const n = nodes[i];
                    let isNodeHovered = this.nodeHovered == n;

                    if (isShadow) {
                        ctx.fillStyle = n.colorID ? n.colorID : "rgb(200,200,200)";
                    }

                    let r = n.getRadius();
                    let xPos = this.getColumnX(entry, n);

                    ctx.beginPath();
                    ctx.arc(
                        xPos,
                        n.getY(),
                        isNodeHovered ? r * 2 : r,
                        0,
                        2 * Math.PI,
                        false
                    );
                    ctx.fill();

                }


                ctx.fillStyle = "#fff";

                // let textWidth:ColumnTextWidth = { min: 10000000, max: 0 };


                /**
                 * Draw Folder names
                 */
                for (let i = 0; i < nodes.length && !isShadow; i++) {
                    const n = nodes[i];
                    let isNodeHovered = this.nodeHovered == n;

                    ctx.font = `${isNodeHovered ? 18 : 13}px Lato`;
                    if (isShadow) {
                        ctx.fillStyle = n.colorID ? n.colorID : "rgb(200,200,200)";
                    }
                    let r = n.getRadius();
                    let xPos = this.getColumnX(entry, n);

                    let xName = xPos + r * 2;
                    let yName = n.y ? n.y + 2 : 0;

                    ctx.fillText(`${n.name}  `, xName, yName);

                }







            }

        }

        ctx.restore();


        this.updateColumns = false;

        if (!isShadow && this.showShadow) {
            ctx.drawImage(this.canvasShadow, 0, 0);
        }

    }

    private clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
        ctx.save();
        this.resetTransform(ctx);
        ctx.clearRect(0, 0, width, height);
        ctx.restore();
    }

    private resetTransform(ctx: CanvasRenderingContext2D) {
        const pxRatio = window.devicePixelRatio;
        ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
    }

}