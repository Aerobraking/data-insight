import { ElementDimensionInstance } from "@/utils/resize";
import * as d3 from "d3";
import {
    Simulation,
    SimulationLinkDatum,
    SimulationNodeDatum,
} from "d3";



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
 */


export abstract class AbstractNode<D = undefined> implements SimulationNodeDatum {

    children: Array<AbstractNode<D>> = [];
    parent: AbstractNode<D> | undefined;
    depth: number = 0;
    id?: string | number;
    hue?: number;

    /**
     * Node’s zero-based index into nodes array. This property is set during the initialization process of a simulation.
     */
    index?: number | undefined;
    /**
     * Node’s current x-position
     */
    x?: number | undefined;
    /**
     * Node’s current y-position
     */
    y?: number | undefined;
    /**
     * Node’s current x-velocity
     */
    vx?: number | undefined;
    /**
     * Node’s current y-velocity
     */
    vy?: number | undefined;
    /**
     * Node’s fixed x-position (if position was fixed)
     */
    fx?: number | null | undefined;
    /**
     * Node’s fixed y-position (if position was fixed)
     */
    fy?: number | null | undefined;

    public getDepth(): number {
        this.depth = 0;
        let p: AbstractNode<D> = this;
        while (p.parent) {
            this.depth++;
            p = p.parent;
        }
        return this.depth;
    }

    private collectNodes(node: AbstractNode<D>, a: Array<AbstractNode<D>>): void {

        a.push(node);

        for (let i = 0; i < node.children.length; i++) {
            let c: AbstractNode<D> = node.children[i];
            this.collectNodes(c, a);
        }
    }

    descendants(): Array<this> {
        let a: Array<this> = [];
        this.collectNodes(this, a);
        return a;
    }

    parents(): Array<this> {
        let a: Array<this> = [];
        let p = this;
        while (parent) {
            a.push(p.parent as this);
            p = p.parent as this;
        }
        return a;
    }

    /**   
   * Returns an array of links for this node, where each link is an object that defines source and target properties.
   * The source of each link is the parent node, and the target is a child node.
   * @returns 
   */
    links(): Array<AbstractLink<D>> {
        let a: Array<AbstractLink<D>> = [];
        this.collectLinks(this, a);
        return a;
    }

    private collectLinks(node: AbstractNode<D>, a: Array<AbstractLink<D>>): void {
        for (let i = 0; i < node.children.length; i++) {
            let c: AbstractNode<D> = node.children[i];
            a.push({ source: node, target: c });
            this.collectLinks(c, a);
        }
    }
}

/**
 * Defines the Link between two AbstractNode instances. Extend it to use it with your AbstractNode subclass.
 */
export class AbstractLink<D> implements SimulationLinkDatum<AbstractNode<D>>{
    constructor(source: AbstractNode<D>, target: AbstractNode<D>) {
        this.source = source;
        this.target = target;
    }
    source: AbstractNode<D>;
    target: AbstractNode<D>;
}

export class AbstractRootNode<D = undefined> {

    constructor(root: AbstractNode<D>) {
        this.root = root;
    }

    root: AbstractNode<D>;

}


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

export abstract class TreeStructureHandler<N extends AbstractNode, AbstractRootNode> {

    constructor(root: AbstractRootNode) {
        this.root = root;
    }

    root: AbstractRootNode;

    /**
     * Is called to sync the current existing tree structure in our model
     * with the actual one from our source. That is typically called when 
     * starting the program. After the sync, the synchronisation is done
     * through the watching of changed in the source.
     */
    abstract syncStructure(): void;

    abstract startWatcher(): void;

    abstract reactToDrop(e: DragEvent): void;

}



export class OverviewEngine {

    constructor(div: HTMLElement, state: EngineState) {

        var _this = this;

        this.state = state

        this.simulation = d3
            .forceSimulation([] as Array<AbstractNode<any>>)
            .force('link', d3.forceLink())
            .force('charge', d3.forceManyBody())
            .force('center', d3.forceCenter())
            .force('dagRadial', null)
            .stop();


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
            }
        });
        this.divObserver.observe(div);
    }

    public destroy() {
        this.divObserver.disconnect();
    }

    state: EngineState;
    size: ElementDimensionInstance;
    divObserver: ResizeObserver;
    simulation: Simulation<AbstractNode<any>, AbstractLink<any>>;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    contextShadow: CanvasRenderingContext2D;
    canvasShadow: HTMLCanvasElement;
    engineActive: boolean = false;

    public start(): void {
        this.tick();
        this.engineActive = true;
    }

    public tick(): void {

        console.log("tick");

        if (this.engineActive) {
            this.simulation.tick();
        }
 


        const globalScale = d3.zoomTransform(this.canvas).k;

        // render the shadow canvas

        // render the canvas
        this.clearCanvas(this.context, this.size.w, this.size.h);
        //
        // state.forceGraph.globalScale(globalScale).tickFrame(); 


        // request next frame
        requestAnimationFrame(() => this.tick());
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