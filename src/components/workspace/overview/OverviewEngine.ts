
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
import { AbstractNode, AbstractOverviewEntry, AbstractLink } from "./OverviewData";
import ColorTracker from 'canvas-color-tracker';
import _ from "underscore";


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

export class OverviewEngine {


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

                        // keep engine running at low intensity throughout drag
                        if (!ev.active) {
                            obj.fx = obj.x; obj.fy = obj.y; // Fix points
                        }

                        this.canvas.classList.add('grabbable');
                    })
                    .on('drag', ev => {
                        const obj = ev.subject;
                        const initPos = obj.__initialDragPos;
                        const dragPos = ev;

                        const k = d3.zoomTransform(this.canvas).k;

                        // Move fx/fy (and x/y) of nodes based on the scaled drag distance since the drag start
                        ['x', 'y'].forEach(c => obj[`f${c}`] = obj[c] = initPos[c] + (dragPos[c] - initPos[c]) / k);

                        // prevent freeze while dragging
                        // state.forceGraph
                        //     .d3AlphaTarget(0.3) // keep engine running at low intensity throughout drag
                        //     .resetCountdown();  // prevent freeze while dragging

                    })
                    .on('end', ev => {
                        console.log("end");
                        const obj = ev.subject;
                        const initPos = obj.__initialDragPos;

                        if (initPos.fx === undefined) { obj.fx = undefined; }
                        if (initPos.fy === undefined) { obj.fy = undefined; }
                        delete (obj.__initialDragPos);

                        // state.forceGraph
                        //     .d3AlphaTarget(0)   // release engine low intensity
                        //     .resetCountdown();  // let the engine readjust after releasing fixed nodes

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
    public showShadow: boolean = false;
    private _rootNodes: any[] = [];

    public get rootNodes(): any[] {
        return this._rootNodes;
    }

    public set rootNodes(value: any[]) {
        this._rootNodes = value;

        for (let j = 0; j < this.rootNodes.length; j++) {
            const root: AbstractOverviewEntry = this.rootNodes[j];

            let nodes: AbstractNode[] = root.root.descendants();

            for (let i = 0; i < nodes.length; i++) {
                const n: AbstractNode = nodes[i];
                n.colorID = this.autocolor.register(n);
            }
        }


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


        // request next frame
        setTimeout(() => {
            requestAnimationFrame(() => this.tick());
        }, 33);
    }


    private drawCanvas(ctx: CanvasRenderingContext2D, isShadow: boolean = false) {

        this.clearCanvas(ctx, this.size.w, this.size.h);

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "rgb(100,100,110)";

        ctx.clearRect(0, 0, this.size.w, this.size.h);
        ctx.fillRect(0, 0, this.size.w, this.size.h);
        ctx.fillStyle = "rgb(200,200,200)";

        this.transform = d3.zoomTransform(this.canvas);
        ctx.translate(this.transform.x, this.transform.y);
        ctx.scale(this.transform.k, this.transform.k);

        if (this.rootNodes && this.transform) {

            if (isShadow) {
                ctx.fillStyle = "rgb(240,240,240)";
                ctx.fillRect(-100,-100,200,200);
            }


            for (let index = 0; index < this.rootNodes.length; index++) {
                const root: AbstractOverviewEntry = this.rootNodes[index];

                ctx.fillStyle = "rgb(200,200,200)";

                let links: AbstractLink[] = root.root.links();


                for (let i = 0; i < links.length; i++) {
                    const n = links[i];
                    let start = n.source;
                    let end = n.target;

                    ctx.beginPath();
                    ctx.lineWidth = 1.1;


                    if (isShadow) {
                        ctx.strokeStyle = start.colorID ? start.colorID : "rgb(200,200,200)";
                    }


                    ctx.moveTo(start.getX(), start.getY());
                    let midY = (start.getY() + end.getY()) / 2;
                    let midX = (start.getX() + end.getX()) / 2;
                    ctx.bezierCurveTo(
                        midX,
                        start.getY(),
                        midX,
                        end.getY(),
                        end.getX(),
                        end.getY()
                    );
                    ctx.stroke();

                }

                let nodes: AbstractNode[] = root.root.descendants();


                for (let i = 0; i < nodes.length; i++) {
                    const n = nodes[i];
                    let isNodeHovered = this.nodeHovered == n;

                    if (isShadow) {
                        ctx.fillStyle = n.colorID ? n.colorID : "rgb(200,200,200)";
                    }

                    let r = 10;

                    ctx.beginPath();
                    ctx.arc(
                        n.getX(),
                        n.getY(),
                        isNodeHovered ? r * 2 : r,
                        0,
                        2 * Math.PI,
                        false
                    );
                    ctx.fill();

                }

            }



        }

        ctx.restore();

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