
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


        /**
         * 
         */

        // Setup node drag interaction
        // d3.select(this.canvas).call(
        //     d3.drag()          .subject(() => {
        //         if (!state.enableNodeDrag) { return null; }
        //         const obj = getObjUnderPointer();
        //         return (obj && obj.type === 'Node') ? obj.d : null; // Only drag nodes
        //       })
        //       .on('start', ev => {
        //         const obj = ev.subject;
        //         obj.__initialDragPos = { x: obj.x, y: obj.y, fx: obj.fx, fy: obj.fy };

        //         // keep engine running at low intensity throughout drag
        //         if (!ev.active) {
        //           obj.fx = obj.x; obj.fy = obj.y; // Fix points
        //         }

        //         // drag cursor
        //         state.canvas.classList.add('grabbable');
        //       })
        //       .on('drag', ev => {
        //         const obj = ev.subject;
        //         const initPos = obj.__initialDragPos;
        //         const dragPos = ev;

        //         const k = d3ZoomTransform(state.canvas).k;
        //         const translate = {
        //           x: (initPos.x + (dragPos.x - initPos.x) / k) - obj.x,
        //           y: (initPos.y + (dragPos.y - initPos.y) / k) - obj.y
        //         };

        //         // Move fx/fy (and x/y) of nodes based on the scaled drag distance since the drag start
        //         ['x', 'y'].forEach(c => obj[`f${c}`] = obj[c] = initPos[c] + (dragPos[c] - initPos[c]) / k);

        //         // prevent freeze while dragging
        //         state.forceGraph
        //           .d3AlphaTarget(0.3) // keep engine running at low intensity throughout drag
        //           .resetCountdown();  // prevent freeze while dragging

        //         state.isPointerDragging = true;

        //         obj.__dragged = true;
        //         state.onNodeDrag(obj, translate);
        //       })
        //       .on('end', ev => {
        //         const obj = ev.subject;
        //         const initPos = obj.__initialDragPos;
        //         const translate = {x: obj.x - initPos.x, y:  obj.y - initPos.y};

        //         if (initPos.fx === undefined) { obj.fx = undefined; }
        //         if (initPos.fy === undefined) { obj.fy = undefined; }
        //         delete(obj.__initialDragPos);

        //         state.forceGraph
        //           .d3AlphaTarget(0)   // release engine low intensity
        //           .resetCountdown();  // let the engine readjust after releasing fixed nodes

        //         // drag cursor
        //         state.canvas.classList.remove('grabbable');

        //         state.isPointerDragging = false;

        //         if (obj.__dragged) {
        //           delete(obj.__dragged);
        //           state.onNodeDragEnd(obj, translate);
        //         }
        //       })
        //   );

        // Setup zoom / pan interaction
        this.zoom = d3.zoom<HTMLCanvasElement, HTMLCanvasElement>()
        this.zoom(d3.select(this.canvas));
        this.zoom.scaleTo(d3.select(this.canvas), this.overview.viewportTransform.scale);
        this.zoom.translateTo(d3.select(this.canvas), this.overview.viewportTransform.x, this.overview.viewportTransform.y);
        this.zoom.scaleExtent([0.1, 8]);
        this.zoom.on("zoom", (event: any, d: HTMLCanvasElement) => {
            let t = d3.zoomTransform(this.canvas);
            this.overview.viewportTransform = { x: t.x, y: t.y, scale: t.k };
        });
        let t = d3.zoomTransform(this.canvas);
    }


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

    zoom: d3.ZoomBehavior<HTMLCanvasElement, HTMLCanvasElement>;
    overview: Overview;
    state: EngineState;
    size: ElementDimensionInstance;
    divObserver: ResizeObserver;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    contextShadow: CanvasRenderingContext2D;
    canvasShadow: HTMLCanvasElement;
    engineActive: boolean = false;

    private _rootNodes: any[] = [];

    public get rootNodes(): any[] {
        return this._rootNodes;
    }

    public set rootNodes(value: any[]) {
        this._rootNodes = value;
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

        // render the shadow canvas

        // render the canvas
        this.clearCanvas(this.size.w, this.size.h);
        this.drawCanvas();



        // request next frame
        setTimeout(() => {
            requestAnimationFrame(() => this.tick());
        }, 33);
    }


    private drawCanvas() {

        this.context.save();

        this.context.fillStyle = "rgb(100,100,110)";

        this.context.clearRect(0, 0, this.size.w, this.size.h);
        this.context.fillRect(0, 0, this.size.w, this.size.h);
        this.context.fillStyle = "rgb(200,200,200)";

        this.transform = d3.zoomTransform(this.canvas);
        this.context.translate(this.transform.x, this.transform.y);
        this.context.scale(this.transform.k, this.transform.k);


        this.context.beginPath();
        this.context.arc(
            400,
            490,
            100,
            0,
            2 * Math.PI,
            false
        );
        this.context.fill();

        if (this.rootNodes && this.transform) {

            for (let index = 0; index < this.rootNodes.length; index++) {
                const root: AbstractOverviewEntry = this.rootNodes[index];

                let nodes: AbstractNode[] = root.root.descendants();

                for (let i = 0; i < nodes.length; i++) {
                    const n = nodes[i];

                    let r = 10;
                    this.context.fillStyle = "rgb(200,200,200)";
                    this.context.beginPath();
                    this.context.arc(
                        n.getX(),
                        n.getY(),
                        r,
                        0,
                        2 * Math.PI,
                        false
                    );
                    this.context.fill();

                }

                let links: AbstractLink[] = root.root.links();
                let ctx = this.context;

                for (let i = 0; i < links.length; i++) {
                    const n = links[i];
                    let start = n.source;
                    let end = n.target;

                    ctx.beginPath();
                    ctx.lineWidth = 1.1;

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
            }



        }

        this.context.restore();

    }


    private clearCanvas(width: number, height: number) {
        this.context.save();
        this.resetTransform();
        this.context.clearRect(0, 0, width, height);
        this.context.restore();
    }

    private resetTransform() {
        const pxRatio = window.devicePixelRatio;
        this.context.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
    }

}