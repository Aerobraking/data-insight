
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
    ZoomScale,
    ZoomTransform,
} from "d3";
import { FolderNode } from "./FileEngine";
import { AbstractNode, AbstractOverviewEntry, AbstractLink, EntryListener, ColumnTextWidth } from "./OverviewData";
import ColorTracker from 'canvas-color-tracker';
import _ from "underscore";
import { EntryCollection } from "@/store/model/Workspace";
import TWEEN from "@tweenjs/tween.js";
import { Tween } from "@tweenjs/tween.js";
import { Ufo } from "mdue";

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
    }

    private static instances: OverviewEngine[] = [];
    private static started: boolean = false;
    private static fpsInterval: number = 0;
    private static now: number = 0;
    private static then: number = 0;
    private static timeLastFrame: number = 0;
    private static elapsed: number = 0;
    // milliseconds till last frame
    private static delta: number = 0;

    private static startClock(): void {
        OverviewEngine.fpsInterval = 1000 / 144;
        OverviewEngine.then = performance.now();
        OverviewEngine.timeLastFrame = performance.now();
        OverviewEngine.tickClock();
    }

    private static tickClock(): void {

        requestAnimationFrame(OverviewEngine.tickClock.bind(this));

        // calc elapsed time since last loop, ideally ~33
        OverviewEngine.now = performance.now();
        OverviewEngine.elapsed = OverviewEngine.now - OverviewEngine.then;

        // if enough time has elapsed, draw the next frame
        if (OverviewEngine.elapsed > OverviewEngine.fpsInterval) {

            for (let i = 0; i < OverviewEngine.instances.length; i++) {
                const inst = OverviewEngine.instances[i];
                inst.tick();
            }

            OverviewEngine.delta = OverviewEngine.elapsed;

            // Get ready for next frame by setting then=now, but also adjust for your
            // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
            OverviewEngine.then = OverviewEngine.now - (OverviewEngine.elapsed % OverviewEngine.fpsInterval);
            OverviewEngine.framecounter++;
            TWEEN.update();
        }

    }

    constructor(div: HTMLElement, state: EngineState, overview: Overview) {

        if (!OverviewEngine.started) {
            OverviewEngine.startClock();
            OverviewEngine.started = true;
        }

        OverviewEngine.instances.push(this);

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

        let context = this.canvas.getContext("2d", { alpha: false });
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

        context = this.canvasShadow.getContext("2d", { alpha: false });
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
                // _this.tick();
            }
        });
        this.divObserver.observe(div);

        d3.select(this.canvas).on('dblclick', function (e: MouseEvent) {

            var rect = _this.canvas.getBoundingClientRect();
            _this.mousePosition = { x: e.clientX - rect.left, y: e.clientY - rect.top };

            let pos = _this.screenToGraphCoords(e);

            _this.setView(1, pos.x, pos.y);
            // _this.setView(1,e.clientX - rect.left, e.clientY - rect.top );

        });

        // Setup node drag interaction
        d3.select(this.canvas).on("mousemove", function (e: MouseEvent) {
            var rect = _this.canvas.getBoundingClientRect();
            _this.mousePosition = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            _this.hoverFinder(_this);
        })
            .call(
                d3.drag<HTMLCanvasElement, unknown>().subject(() => {
                    const obj = this.getNodeAtMousePosition();
                    return obj; // Only drag nodes
                })
                    .on('start', ev => {
                        _this.pauseHovering = true;
                        const obj = ev.subject;
                        obj.__initialDragPos = { x: obj.x, y: obj.y, fx: obj.fx, fy: obj.fy };
                        const node = ev.subject as AbstractNode;

                        if (!node.parent || true) {
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

                        if (!node.parent || true) {
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
                            .alpha(1);  // prevent freeze while dragging

                    })
                    .on('end', ev => {
                        _this.pauseHovering = false;
                        const obj = ev.subject;
                        const node = ev.subject as AbstractNode;
                        const initPos = obj.__initialDragPos;
                        if (node.entry) {
                            node.entry.isSimulationActive = true;
                        }
                        // if (initPos.fx === undefined) { obj.fx = undefined; }
                        if (initPos.fy === undefined) { obj.fy = undefined; }
                        delete (obj.__initialDragPos);

                        if (!node.parent || true) {
                            let children = node.descendants(false);
                            for (let i = 0; i < children.length; i++) {
                                const child: any = children[i];
                                const childInitPos = child.__initialDragPos;
                                // if (childInitPos.fx === undefined) { child.fx = undefined; }
                                if (childInitPos.fy === undefined) { child.fy = undefined; }
                                delete (child.__initialDragPos);
                            }
                        }

                        node.entry?.simulation
                            .alphaTarget(0.004) // keep engine running at low intensity throughout drag
                            ;

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
        this.zoom.scaleExtent([0.02, 8]);
        this.zoom.on("zoom", (event: any, d: HTMLCanvasElement) => {
            let t = d3.zoomTransform(this.canvas);
            this.overview.viewportTransform = { x: t.x, y: t.y, scale: t.k };
        });
        this.zoom.on("start", (event: any, d: HTMLCanvasElement) => {
            _this.pauseHovering = true;
        });
        this.zoom.on("end", (event: any, d: HTMLCanvasElement) => {
            _this.pauseHovering = false;
        });
        let t = d3.zoomTransform(this.canvas);
    }

    getNodeAtMousePosition = () => {
        // let obj = null;
        // const pxScale = 1;//window.devicePixelRatio;
        // const px: any = (this.mousePosition.x > 0 && this.mousePosition.y > 0)
        //     ? this.contextShadow.getImageData(this.mousePosition.x * pxScale, this.mousePosition.y * pxScale, 1, 1)
        //     : null;
        // px && (obj = this.autocolor.lookup(px.data));

        let mGraph = this.screenToGraphCoords(this.mousePosition);

        let n = undefined;
        for (let i = 0; i < this.rootNodes.length; i++) {
            const e = this.rootNodes[i];
            if (e.quadtree) {
                let nFound = e.quadtree.find(mGraph.x, mGraph.y, 500);
                if (nFound) {
                    n = nFound;
                }
            }
            // console.log(nFound);

        }

        return n;
        // return obj != null ? obj : undefined;

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

    public setView(scale: number, x: number, y: number, duration: number = 1250) {

        let _this = this;



        // setter
        if (_this.transform !== undefined) {
            if (duration == 0) { // no animation
                setZoom({ k: _this.transform.k, x: x, y: y });
            } else {
                new TWEEN.Tween({
                    k: _this.transform.k,
                    x: (_this.size.w / 2 - _this.transform.x) / _this.transform.k,
                    y: (_this.size.h / 2 - _this.transform.y) / _this.transform.k
                })
                    .to({ k: scale, x: x, y: y }, duration)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onUpdate((data: { k: number, x: number, y: number }) => setZoom(data))
                    .start();
            }
            return this;
        }

        // function getCenter() {
        //     const t = _this.transform;
        //     return { x: (state.width / 2 - t.x) / t.k, y: (state.height / 2 - t.y) / t.k };
        //   }

        function setZoom(data: { k: number, x: number, y: number }) {

            // _this.zoom.transform(d3.select(_this.canvas), data.k, [data.x, data.y]);
            _this.zoom.scaleTo(d3.select(_this.canvas), data.k);
            _this.zoom.translateTo(d3.select(_this.canvas), data.x, data.y);


        }
    }

    hoverFinder(_this: this) {
        const pxScale = 1;//window.devicePixelRatio;
        if (!this.pauseHovering && _this.mousePosition && _this.mousePosition.x > 0 && _this.mousePosition.y > 0) {

            // let mGraph = _this.screenToGraphCoords(_this.mousePosition);

            let n = this.getNodeAtMousePosition();

            // n = undefined;
            // for (let i = 0; i < _this.rootNodes.length; i++) {
            //     const e = _this.rootNodes[i];
            //     if (e.quadtree) {
            //         let nFound = e.quadtree.find(mGraph.x, mGraph.y);
            //         if (nFound) {
            //             n = nFound;
            //         }
            //     }
            //     // console.log(nFound);

            // }



            if (n) {
                if (n != _this.nodeHovered) {
                    _this.nodeHovered = n;
                    _this.canvas.style.cursor = "pointer";
                    _this.setFilterList("hover", [...n.descendants(), ...n.parents()]);
                }
            } else {
                _this.setFilterList("hover", []);
                _this.nodeHovered = undefined;
                _this.setFilterList("hover");
                _this.canvas.style.cursor = "auto";
            }
        }
    };

    pauseHovering: boolean = false;



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
    engineActive: boolean = true;
    public showShadow: boolean = false;
    private _rootNodes: any[] = [];


    private nodeFilterList: Map<string, AbstractNode[]> = new Map();
    private nodeFiltered: AbstractNode[] = [];
    private notFound: Map<AbstractNode, { o: number, d: boolean }> = new Map();
    private static framecounter: number = 0;

    public setFilterList(key: string, listNodes: AbstractNode[] | undefined = undefined, showImmediately: boolean = false) {

        if (listNodes) {
            this.nodeFilterList.set(key, listNodes);
        } else {
            this.nodeFilterList.delete(key);
        }

        this.nodeFiltered = [];

        let lists: AbstractNode[][] = Array.from(this.nodeFilterList.values());

        if (lists.length > 0) {
            this.nodeFiltered = lists[0];
            for (let i = 1; i < lists.length; i++) {
                this.nodeFiltered = this.nodeFiltered.filter(value => lists[i].includes(value));
            }


        }

        if (this.nodeFiltered.length > 0) {
            // search for new nodes that will be blending out or in
            for (let index = 0; index < this.rootNodes.length; index++) {
                const entry = this.rootNodes[index] as AbstractOverviewEntry;

                for (let j = 0; j < entry.nodes.length; j++) {
                    const n = entry.nodes[j];

                    if (!this.nodeFiltered.includes(n)) {
                        if (!this.notFound.has(n)) {
                            // add it to blending out when not already in
                            this.notFound.set(n, { o: 1, d: false });
                        } else {
                            // node is in blending mode, so make it blending out
                            let o = this.notFound.get(n)?.o;
                            o = o ? o : 0;
                            this.notFound.set(n, { o, d: false });
                        }
                    } else {

                        if (this.notFound.has(n)) {
                            // node is in blending mode, so make it blending in
                            let o = this.notFound.get(n)?.o;
                            o = o ? o : 0;
                            this.notFound.set(n, { o, d: true });
                        }
                    }
                }
            }
        } else {
            // all blending nodes will be set to blending in
            let listOpacity = Array.from(this.notFound.keys());
            for (let i = 0; i < listOpacity.length; i++) {
                const n = this.notFound.get(listOpacity[i]);
                if (n) {
                    n.d = true;
                    this.notFound.set(listOpacity[i], n);
                }
            }
        }

        if (listNodes) {
            for (let i = 0; i < listNodes.length; i++) {
                const n = listNodes[i];
                if (this.nodeFiltered.includes(n)) {
                    const data = this.notFound.delete(n);
                }
            }
        }


    }

    nodeAdded(node: AbstractNode) {
        node.colorID = this.autocolor.register(node);
        this.updateColumns = true;
    }

    /**
     * When a node is updated, we recalculate the column widths
     */
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
            for (let i = 0; i < entry.nodes.length; i++) {
                const n = entry.nodes[i];
                n.colorID = this.autocolor.register(n);
            }
            entry.root.colorID = this.autocolor.register(entry.root);
        }

        this.updateColumns = true;
    }

    transform: ZoomTransform | undefined;

    enablePainting: boolean = true;

    public tick(): void {

        if (this.engineActive) {
            for (let index = 0; index < this._rootNodes.length; index++) {
                this._rootNodes[index].tick();
            }
        }

        this.hoverFinder(this);

        let stepPos = 1 + OverviewEngine.delta / 60;
        let stepNeg = 1 - OverviewEngine.delta / 160;

        let listOpacity = Array.from(this.notFound.keys());
        for (let i = 0; i < listOpacity.length; i++) {
            const n = this.notFound.get(listOpacity[i]);
            if (n) {
                n.o *= n.d ? stepPos : stepNeg;
                n.o = Math.min(1, Math.max(0.05, n.o));
                if (n.o >= 1) {
                    this.notFound.delete(listOpacity[i]);
                }
            }
        }

        if (this.enablePainting) {
            // render the canvas
            this.drawCanvas(this.context);
            // render the shadow canvas
            if (OverviewEngine.framecounter % 3 == 0) {
                //   this.drawCanvas(this.contextShadow, true);
            }
        }

    }

    public getColumnX(entry: AbstractOverviewEntry, n: AbstractNode) {
        let d = this.getColumnData(entry, n.depth);
        return n.parent && d ? d.x + entry.root.getX() : n.getX();
    }

    public getColumnWidth(entry: AbstractOverviewEntry, n: AbstractNode) {
        let d = this.getColumnData(entry, n.depth);
        return n.parent && d ? d.width : 200;
    }

    mapEntryColumns: Map<number, Map<number, { x: number, width: number }>> = new Map();
    setWidthsTween: Map<AbstractOverviewEntry, Map<number, Tween<any>>> = new Map();

    public getColumnData(entry: AbstractOverviewEntry, depth: number, create: boolean = true) {
        return this.getColumnDataByID(entry.id, depth, create);
    }

    public getColumnDataByID(id: number, depth: number, create: boolean = true) {
        let entryColumns = this.mapEntryColumns.get(id);
        if (!entryColumns) {
            entryColumns = new Map();
            this.mapEntryColumns.set(id, entryColumns);
        }
        let data = entryColumns.get(depth);
        if (!data && create) {
            data = { x: 0, width: 100 };
            const dataPrev = this.getColumnDataRawByID(id, depth - 1);
            if (dataPrev) {
                data.x = dataPrev.x + dataPrev.width;
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
        if (data && data.width != value.max) {
            /**
             * the changed column gets the new width directly as itself will not visibility be changed 
             */
            data.width = value.max;
            for (let i = 0; i < entry.nodes.length; i++) {
                const n = entry.nodes[i];
                if (n.depth == value.depth) {
                    n.x = n.fx = data.x;
                }
            }
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

                    diff += dataPrev.width;

                    let entryTweenList = this.setWidthsTween.get(entry);

                    if (!entryTweenList) {
                        entryTweenList = new Map();
                    }

                    let tween = entryTweenList.get(i);
                    if (tween) {
                        tween.stop();
                    }

                    /**
                     *  we give the next column 
                     */
                    tween = new TWEEN.Tween({ x: dataNext.x, id: entry.id, depth: i });
                    tween.to({ x: diff }, 2000)
                    tween.easing(TWEEN.Easing.Elastic.Out)
                    tween.delay(index * 110)
                    tween.onUpdate(function (object) {
                        let d = _this.getColumnDataRawByID(object.id, object.depth);
                        if (d) {
                            d.x = object.x;
                        }
                    })
                    tween.onComplete(function (object) {
                        for (let k = 0; k < entry.nodes.length; k++) {
                            const n = entry.nodes[k];
                            if (n.depth == object.depth) {
                                n.x = n.fx = object.x;
                            }
                        }
                    });
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

        ctx.fillStyle = "rgb(30,30,30)";
        ctx.fillRect(0, 0, this.size.w, this.size.h);

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
                let nodes: AbstractNode[] = entry.nodes;
                let links: AbstractLink[] = entry.links;

                if (OverviewEngine.framecounter % 100 == 0) {
                    //   this.drawCanvas(this.contextShadow, true);

                    for (let l = 0; l < nodes.length; l++) {
                        const n = nodes[l];
                        console.log(n.getX());

                    }
                    console.log(" ");
                }

                let widths: { x: number, width: number }[] = [];

                for (let i = 0, e = true; e; i++) {
                    let w = this.getColumnData(entry, i, false);
                    if (w) {
                        widths[i] = w;
                    }
                    e = w != undefined;
                }
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

                        let textw = (ctx.measureText(n.name).width + n.getRadius() * 3 + 70) * 2;
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

                this.drawLinks(ctx, isShadow, links, widths, entry);
                this.drawNodes(ctx, isShadow, nodes, widths, entry);
                this.drawText(ctx, isShadow, nodes, widths, entry);
            }

        }

        ctx.restore();

        this.updateColumns = false;

        if (!isShadow && this.showShadow) {
            ctx.drawImage(this.canvasShadow, 0, 0);
        }

    }

    drawLinks(ctx: CanvasRenderingContext2D, isShadow: boolean = false, links: AbstractLink[], widths: { x: number, width: number }[], entry: AbstractOverviewEntry) {

        let scale = this.transform ? this.transform.k : 1;
        let lineWidth = 2 / scale;
        let op: number = scale >= 0.1 && scale <= 0.35 ? (scale - 0.1) * 4 : scale < 0.1 ? 0 : 1;
        op = 1 - op;
        op = Math.max(op, 0.075)
        /**
         *  Links
         */
        for (let i = 0; i < links.length; i++) {
            const n = links[i];
            let start = n.source;
            let end = n.target;
            const opacity = this.notFound.get(end);
            if (!isShadow && opacity) {
                ctx.globalAlpha = opacity.o;
            } else {
                ctx.globalAlpha = 1;
            }



            if (true || this.nodeFiltered.length == 0 || this.nodeFiltered.includes(end)) {
                ctx.beginPath();
                ctx.lineWidth = isShadow ? 10 : lineWidth;

                let xStart = widths[start.depth] ? widths[start.depth].x : 0;
                let xEnd = widths[end.depth] ? widths[end.depth].x : 0;

                if (start.isRoot()) {
                    ctx.strokeStyle = "#555";
                }

                let grd = ctx.createLinearGradient(xStart, 0, xEnd, 0);

                /*
                a = r * r * PI
                250 * 0.4 = 
interpolateWarm
interpolatePlasma
                */

                grd.addColorStop(0.35, d3.interpolateWarm(1 - start.getRadius() / 250).replace(")", "," + op + ")").replace("(", "a("));
                grd.addColorStop(0.7, d3.interpolateWarm(1 - end.getRadius() / 250));
                ctx.strokeStyle = grd;

                if (isShadow) {
                    ctx.strokeStyle = end.colorID ? end.colorID : "rgb(200,200,200)";
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

        }
    }

    drawNodes(ctx: CanvasRenderingContext2D, isShadow: boolean = false, nodes: AbstractNode[], widths: { x: number, width: number }[], entry: AbstractOverviewEntry) {


        var mycolor = d3.scaleLinear<string>()
            .domain([0, 100, 250])
            .range(["green", "yellow", "red"]);

        var angle = 2 * Math.PI;
        var i = 0, len = nodes.length;
        while (i < len) {

            const n = nodes[i];
            const opacity = this.notFound.get(n);
            if (!isShadow && opacity) {
                ctx.globalAlpha = opacity.o;
            } else {
                ctx.globalAlpha = 1;
            }

            if (true || this.nodeFiltered.length == 0 || this.nodeFiltered.includes(n)) {

                var r = isShadow ? 100 : n.getRadius();
                ctx.fillStyle = mycolor((r / 250));
                ctx.fillStyle = d3.interpolateWarm(1 - r / 250);

                if (isShadow) {
                    ctx.fillStyle = n.colorID ? n.colorID : "rgb(200,200,200)";
                }

                let xPos = widths[n.depth] ? widths[n.depth].x : 0;

                ctx.beginPath();
                ctx.arc(
                    xPos,
                    n.getY(),
                    isShadow ? r * 1.2 : r,
                    0,
                    angle
                );
                ctx.fill();
            }

            i++
        }

    }

    private isHoveredNode(n: any) {
        return this.nodeHovered == n;
    }

    drawText(ctx: CanvasRenderingContext2D, isShadow: boolean = false, nodes: AbstractNode[], widths: { x: number, width: number }[], entry: AbstractOverviewEntry) {

        ctx.fillStyle = "#fff";

        let scale = this.transform ? this.transform.k : 1;

        let op: number = scale >= 0.1 && scale <= 0.2 ? (scale - 0.1) * 10 : scale < 0.1 ? 0 : 1;

        // let textWidth:ColumnTextWidth = { min: 10000000, max: 0 };
        /**
         * Draw Folder names
         */
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];

            const opacity = this.notFound.get(n);
            if (!isShadow && opacity) {
                ctx.globalAlpha = opacity.o;
            } else {
                ctx.globalAlpha = op;
            }

            let isNodeHovered = this.isHoveredNode(n);

            if (true || this.nodeFiltered.length == 0 || this.nodeFiltered.includes(n)) {

                let xPos = widths[n.depth] ? widths[n.depth].x : 0;
                let width = widths[n.depth] ? widths[n.depth].width : 10;

                if (!n.isRoot()) {

                    if (op > 0) {

                        let fontSize = isNodeHovered && !isShadow ? 18 : 24;
                        ctx.font = `${fontSize}px Lato`;
                        if (isShadow) {
                            ctx.fillStyle = n.colorID ? n.colorID : "rgb(200,200,200)";
                        }

                        let xName = xPos + 100 * 1.1;
                        let yName = n.getY() + fontSize / 4;

                        if (isShadow) {
                            ctx.fillStyle = n.colorID ? n.colorID : "rgb(200,200,200)";
                            ctx.fillRect(xName, n.getY() - fontSize, width, fontSize * 2);
                        } else {
                            ctx.fillStyle = "#fff";
                            ctx.fillText(`${n.name}  `, xName, yName);
                        }
                    }

                } else {

                    let fontSize = 16 / scale;
                    let translate = (fontSize) / 4;

                    ctx.font = `${fontSize}px Lato`;
                    if (isShadow) {
                        ctx.fillStyle = n.colorID ? n.colorID : "rgb(200,200,200)";
                    }

                    let name = isNodeHovered && !isShadow && n.entry ? n.entry.path : n.name;
                    let xName = xPos - ctx.measureText(name).width - 100 * 2;
                    let yName = n.getY() + translate;


                    if (isShadow) {
                        ctx.fillStyle = n.colorID ? n.colorID : "rgb(200,200,200)";
                        ctx.fillRect(xName, n.getY() - fontSize, ctx.measureText(n.name).width, fontSize * 2);
                    } else {
                        ctx.fillStyle = "#fff";
                        ctx.fillText(`${name}  `, xName, yName);
                    }
                }
            }


        }
        ctx.globalAlpha = 1;

    }

    private clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
        ctx.save();
        this.resetTransform(ctx);
        ctx.clearRect(0, 0, width, height);
        ctx.restore();
    }

    private resetTransform(ctx: CanvasRenderingContext2D) {
        const pxRatio = window.devicePixelRatio;
        // ctx.setTransform(pxRatio, 0, 0, pxRatio, 0, 0);
    }

}