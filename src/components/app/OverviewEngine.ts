
import { ElementDimension, ElementDimensionInstance } from "@/utils/resize";
import * as d3 from "d3";
import {
    D3DragEvent,
    ZoomTransform,
} from "d3";
import { AbstractNode, AbstractLink, EntryListener, ColumnTextWidth } from "../../store/model/app/overview/AbstractNode";
import ColorTracker from 'canvas-color-tracker';
import _ from "underscore";
import TWEEN from "@tweenjs/tween.js";
import { Tween } from "@tweenjs/tween.js";
import { Overview } from "@/store/model/app/Workspace";
import { AbstractNodeShell } from "@/store/model/app/overview/AbstractNodeShell";
import AbstractNodeShellIfc from "@/store/model/app/overview/AbstractNodeShellIfc";
import { ipcRenderer } from "electron";
import { OV_COLUMNWIDTH } from "./OverviewEngineValues";

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

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


/**
          * 1. Das attr des Stats den wir nutzen wollen
          * 2. Ein min und max Wert der Stats (alles außerhalb davon wird ausgeblendet)
          * 3. Eine funktion die diese 3 werte bekommt + den stats Wert von einem node, damit 
          *    man den farbwert zurückgeben kann.
          */
export interface OverviewColorScale<N extends AbstractNode> {
    getColor(node: N, stat: number, min: number, max: number): void;
}

export interface ColorStatsSettings<N> {
    attr: string,
    min: number,
    max: number,
    colorFunction: (node: N, stat: number, min: number, max: number) => string
}


interface D3Drag extends DragEvent {
    active: any;
    subject: any;
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
    private static elapsed: number = 0;
    private static elapsedTotal: number = 0;
    public static framecounter: number = 0;
    // milliseconds till last frame
    private static delta: number = 0;

    private static startClock(): void {
        OverviewEngine.fpsInterval = 1000 / 144;
        OverviewEngine.then = performance.now();
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
            OverviewEngine.elapsedTotal += OverviewEngine.delta;

            // Get ready for next frame by setting then=now, but also adjust for your
            // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
            OverviewEngine.then = OverviewEngine.now - (OverviewEngine.elapsed % OverviewEngine.fpsInterval);
            OverviewEngine.framecounter++;
            TWEEN.update();
        }

    }

    pauseHovering: boolean = false;
    public selection: AbstractNode[] = [];
    mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    autocolor: ColorTracker = new ColorTracker();
    zoom: d3.ZoomBehavior<HTMLCanvasElement, HTMLCanvasElement>;
    overview: Overview;
    size: ElementDimensionInstance;
    divObserver: ResizeObserver;
    skipInitialResize: number = 0;
    canvas: HTMLCanvasElement;
    nodeHovered: AbstractNode | undefined;
    listnodesHovered: AbstractNode[] = [];
    nodeShift: AbstractNode | undefined;

    context: CanvasRenderingContext2D;
    contextShadow: CanvasRenderingContext2D;
    canvasShadow: HTMLCanvasElement;
    engineActive: boolean = true;
    public showShadow: boolean = false;
    private _rootNodes: AbstractNodeShell[] = [];

    private nodeFilterList: Map<string, AbstractNode[]> = new Map();
    private nodeFiltered: AbstractNode[] = [];
    private notFound: Map<AbstractNode, { o: number, d: boolean }> = new Map();

    public updateSelection(findNode: boolean = true, newSelectedNode: AbstractNode | undefined = undefined): AbstractNode | undefined {

        if (newSelectedNode) {
            this.selection = [];
            this.selection.push(newSelectedNode);
        } else
            if (findNode) {
                const node: AbstractNode | undefined = this.getNodeAtMousePosition();
                // if (e.shiftKey) {
                //     if (node && !_this.selection.includes(node)) _this.selection.push(node);
                // } else if (e.ctrlKey) {
                //     if (node) _this.selection.includes(node) ? _this.selection.splice(_this.selection.indexOf(node), 1) : _this.selection.push(node);
                // } else {
                this.selection = [];
                if (node) this.selection.push(node);
                // }
            }

        const listSelection = [];
        for (let i = 0; i < this.selection.length; i++) {
            const n = this.selection[i];
            listSelection.push(...n.descendants(), ...n.parents());
        }

        this.fireSelectionUpdate();
        listSelection.length == 0 ? this.setFilterList("selection") : this.setFilterList("selection", listSelection);

        return this.selection.length > 0 ? this.selection[0] : undefined;
    }

    constructor(div: HTMLElement, overview: Overview) {

        if (!OverviewEngine.started) {
            OverviewEngine.startClock();
            OverviewEngine.started = true;
        }

        OverviewEngine.instances.push(this);

        var _this = this;

        this.overview = overview;

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
        this.divObserver = new ResizeObserver(_.throttle((entries: ResizeObserverEntry[]) => {
            for (let i = 0; i < entries.length && i < 1; i++) {
                const e = entries[i];
                e.target; // div element
                let w = Math.max(10, e.contentRect.width);
                let h = Math.max(10, e.contentRect.height);

                if (this.skipInitialResize++ > 0) {
                    let diffX = this.canvas.width - w,
                        diffY = this.canvas.height - h; 

                    this.zoom.translateBy(d3.select(this.canvas), diffX / 2, diffY / 2);
                }

                this.canvas.width = w, this.canvas.height = h;
                this.canvasShadow.width = w, this.canvasShadow.height = h;

                this.size.w = w;
                this.size.h = h;


            }
            this.tick();
        }, 5));
        this.divObserver.observe(div);

        d3.select(this.canvas).on('dblclick', function (e: MouseEvent) {

            var rect = _this.canvas.getBoundingClientRect();
            // update saved internal canvas mouse position
            _this.mousePosition = { x: e.clientX - rect.left, y: e.clientY - rect.top };

            let pos = _this.screenToGraphCoords(e);

            _this.setView(1, pos.x, pos.y, 400);
        });


        d3.select(this.canvas).on('mousedown', function (e: MouseEvent) {

            /**
             * Left click
             */
            if (e.button == 0) {

                const node = _this.updateSelection();

                if (e.shiftKey && node) {
                    ipcRenderer.send("ondragstart", [node.getPath()]);
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }
        });

        // Setup node drag interaction
        d3.select(this.canvas).on("mousemove", _.throttle(function (e: MouseEvent) {
            var rect = _this.canvas.getBoundingClientRect();
            _this.mousePosition = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            _this.hoverFinder(_this);


        }, 16)).call(
            d3.drag<HTMLCanvasElement, unknown>().subject(() => {
                const obj = this.getNodeAtMousePosition();
                if (obj && obj.isRoot()) {
                    return obj.entry;
                }
                return obj; // Only drag nodes
            })
                .on('start', (ev: D3DragEvent<HTMLCanvasElement, unknown, any>) => { 
                    const obj = ev.subject;

                    _this.nodeShift = undefined;
                    if (ev.sourceEvent.altKey) {
                        _this.nodeShift = obj instanceof AbstractNodeShell ? undefined : obj; 

                        return;
                    } else {

                        this.canvas.classList.add('grabbable');

                        _this.pauseHovering = true;

                        obj.__initialDragPos = {
                            x: obj.x,
                            y: obj.y,
                            fx: obj instanceof AbstractNodeShell ? obj.x : obj.fx,
                            fy: obj instanceof AbstractNodeShell ? obj.y : obj.fy
                        };

                        if (obj instanceof AbstractNodeShell) {

                        } else {
                            const node = ev.subject as AbstractNode;
                            node.fy = node.y; // Fix points

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
                    }

                })
                .on('drag', (ev: D3DragEvent<HTMLCanvasElement, unknown, any>) => {

                    if (_this.nodeShift) { 
                        return;
                    }

                    // @ts-ignore: Unreachable code error
                    const obj = ev.subject;

                    const initPos = obj.__initialDragPos;
                    const dragPos = ev;

                    const k = d3.zoomTransform(this.canvas).k;

                    let diffX = (dragPos.x - initPos.x) / k;
                    let diffY = (dragPos.y - initPos.y) / k;

                    if (obj instanceof AbstractNodeShell) {
                        obj.setCoordinates({ x: initPos.x + diffX, y: initPos.y + diffY })
                    } else {
                        const node = ev.subject as AbstractNode;
                        /**
                         * the root can be moved in any direction and moves the whole tree with it
                         */
                        node.fy = node.y = initPos.y + diffY;

                        let children = node.descendants(false);
                        for (let i = 0; i < children.length; i++) {
                            const child: any = children[i];
                            const childInitPos = child.__initialDragPos;
                            child.fy = child.y = childInitPos.y + diffY;
                        }

                        // prevent freeze while dragging
                        node.entry?.simulation.alpha(1);  // prevent freeze while dragging
                    }
                    _this.fireSelectionUpdate();

                })
                .on('end', ev => {
                    _this.pauseHovering = false;
                    this.canvas.classList.remove('grabbable');

                    const obj = ev.subject; const node = ev.subject as AbstractNode;
                    const initPos = obj.__initialDragPos;


                    delete (obj.__initialDragPos);

                    if (obj instanceof AbstractNodeShell) {
                        return;
                    }

                    if (node.entry) {
                        node.entry.isSimulationActive = true;
                    }

                    if (initPos.fy === undefined) { obj.fy = undefined; }

                    let children = node.descendants(false);
                    for (let i = 0; i < children.length; i++) {
                        const child: any = children[i];
                        const childInitPos = child.__initialDragPos;
                        if (childInitPos.fy === undefined) { child.fy = undefined; }
                        delete (child.__initialDragPos);
                    }

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
            return true;
        });

        this.zoom.translateTo(d3.select(this.canvas), this.overview.viewportTransform.x, this.overview.viewportTransform.y);
        this.zoom.scaleTo(d3.select(this.canvas), this.overview.viewportTransform.scale);
        this.zoom.scaleExtent([0.02, 2]);
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
        this.overview.viewportTransform = { x: t.x, y: t.y, scale: t.k };
    }

    public clearSelection() {
        this.selection = [];
        this.setFilterList("selection");
        this.fireSelectionUpdate();
    }

    private fireSelectionUpdate() {
        this.selectionListener ?
            this.selectionListener(this.selection.length > 0 ? this.selection[0] : undefined) : 0;
    }

    private selectionListener: ((n: AbstractNode | undefined) => void) | undefined = undefined;

    public setSelectionListener(l: (n: AbstractNode | undefined) => void) {
        this.selectionListener = l;
    }

    public getNodeAtMousePosition(): AbstractNode | undefined {

        let mGraph = this.screenToGraphCoords(this.mousePosition);
        let scale = this.transform ? Math.max(40 / this.transform.k, 100) : 200;
        let n = undefined;
        for (let i = 0; this.transform && this.transform.k > 0.005 && i < this.rootNodes.length; i++) {
            const e = this.rootNodes[i];
            if (e.quadtree) {
                let nFound = e.quadtree.find(mGraph.x - e.x, mGraph.y - e.y, scale);
                if (nFound) {
                    n = nFound;
                }
            }

        }

        return n;
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
            let rect = this.canvas.getBoundingClientRect();
            let x = c.clientX - rect.left;
            let y = c.clientY - rect.top;
            return { x: (x - t.x) / t.k, y: (y - t.y) / t.k };
        } else {
            return { x: (c.x - t.x) / t.k, y: (c.y - t.y) / t.k };
        }
    }

    public destroy() {
        this.divObserver.disconnect();
    }

    public getNodesBoundingBox(padding: number = 1): ElementDimension {

        const d: ElementDimensionInstance = new ElementDimensionInstance(-Infinity, -Infinity, 0, 0, Infinity, Infinity);

        for (let index = 0; index < this._rootNodes.length; index++) {

            const e = this._rootNodes[index];
            for (let j = 0; j < this._rootNodes[index].nodes.length; j++) {
                const n = this._rootNodes[index].nodes[j];

                const x = n.getX() + e.x;
                const y = n.getY() + e.y;

                d.x = d.x < x ? x : d.x;
                d.x2 = d.x2 > x ? x : d.x2;
                d.y = d.y < y ? y : d.y;
                d.y2 = d.y2 > y ? y : d.y2;
            }
        }
        d.calculateSize();
        d.scaleFromCenter(padding);
        return d;
    }

    public zoomToFit() {
        if (this.rootNodes.length > 0) {
            this.setViewBox(this.getNodesBoundingBox(1.6));
        }
    }

    public setViewBox(dim: ElementDimension) {
        const scale = Math.min(Math.abs(this.canvas.width / dim.w), Math.abs(this.canvas.height / dim.h));
        this.setView(scale, dim.x + dim.w / 2, +dim.y + dim.h / 2, 400);
    }

    public setView(scale: number | undefined = undefined, x: number, y: number, duration: number = 70) {

        let _this = this;

        // setter
        if (_this.transform !== undefined) {

            scale = scale == undefined ? _this.transform.k : scale;

            if (duration == 0) { // no animation
                setZoom({ k: scale, x: x, y: y });
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
        const pxScale = 1; //window.devicePixelRatio;
        if (!this.pauseHovering && _this.mousePosition && _this.mousePosition.x >= 0 && _this.mousePosition.y >= 0) {

            let n: AbstractNode | undefined = this.getNodeAtMousePosition();

            _this.canvas.style.cursor = _this.nodeHovered ? "move" : "auto";

            if (n) {
                if (n != _this.nodeHovered) {
                    _this.nodeHovered = n;
                    _this.listnodesHovered = [];
                    _this.listnodesHovered.push(...n.descendants(), ...n.parents());
                    // _this.setFilterList("hover", [...n.descendants(), ...n.parents()]);
                }
            } else {
                _this.nodeHovered = undefined;
                _this.setFilterList("hover");
                _this.listnodesHovered = [];
            }
        }
    };

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
                const entry = this.rootNodes[index] as AbstractNodeShell;

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
        this.updateNodeColorScale(node);
        this.updateColumns = true;
        // if (node.entry) {
        //     node.x = this.getColumnX(node.entry, node);
        // }
        this.updateSelection();
    }

    /**
     * When a node is updated, we recalculate the column widths
     */
    nodeUpdate() {
        /**
         * Recalculate column widths
         */
        // this.updateColumns = true;
        this.updateNodeColorScale();
    }

    public get rootNodes(): any[] {
        return this._rootNodes;
    }

    public set rootNodes(value: any[]) {
        this._rootNodes = value;

        // register the root nodes for color ids
        for (let j = 0; j < this.rootNodes.length; j++) {
            const entry: AbstractNodeShell = this.rootNodes[j];
            for (let i = 0; i < entry.nodes.length; i++) {
                const n = entry.nodes[i];
                n.colorID = this.autocolor.register(n);
            }
            entry.root.colorID = this.autocolor.register(entry.root);
        }
        this.updateNodeColorScale();

        this.updateColumns = true;
        this.clearSelection();
    }

    transform: ZoomTransform | undefined;

    enablePainting: boolean = true;

    public tick(): void {


        for (let index = 0; index < this._rootNodes.length; index++) {
            this._rootNodes[index].tick();
        }


        if (this.colorTransitionElapsed != undefined) {
            this.colorTransitionElapsed += OverviewEngine.delta;

            if (this.colorTransitionElapsed > this.colorTransitionTarget) {
                this.colorTransitionElapsed = undefined;
                this.colorTransitionMap.clear();
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
                n.o = Math.min(1, Math.max(0.04, n.o));
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

    private opacityMin = 0.04;

    public getColumnX(entry: AbstractNodeShellIfc, n: AbstractNode) {

        return n.depth * OV_COLUMNWIDTH;

        // let d = this.getColumnData(entry, n.depth);
        // return n.parent && d ? d.x + entry.root.getX() : n.getX();
    }
    public getColumnXByDepth(entry: AbstractNodeShell, depth: number) {

        return depth * OV_COLUMNWIDTH;
        // let d = this.getColumnData(entry, depth);
        // return d ? d.x + entry.root.getX() : 0;
    }



    mapEntryColumns: Map<number, Map<number, { x: number, width: number }>> = new Map();
    setWidthsTween: Map<AbstractNodeShell, Map<number, Tween<any>>> = new Map();

    public getColumnData(entry: AbstractNodeShell, depth: number, create: boolean = true) {

        return { x: depth * OV_COLUMNWIDTH, width: OV_COLUMNWIDTH };

        // let entryColumns = this.mapEntryColumns.get(entry.id);
        // if (!entryColumns) {
        //     entryColumns = new Map();
        //     this.mapEntryColumns.set(entry.id, entryColumns);
        // }

        // let data = entryColumns.get(depth);
        // if (!data && create) {
        //     data = { x: 0, width: 100 };
        //     const dataPrev = this.getColumnDataRawByID(entry.id, depth - 1);
        //     if (dataPrev) {
        //         data.x = dataPrev.x + dataPrev.width;
        //     }

        //     entryColumns.set(depth, data);
        // }
        // return data;
    }

    public getColumnDataRaw(entry: AbstractNodeShell, depth: number) {
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

    public setColumnTextWidth(entry: AbstractNodeShell, value: ColumnTextWidth) {
        let _this = this;
        let data = this.getColumnData(entry, value.depth);
        if (data) {
            for (let i = 0; i < entry.nodes.length; i++) {
                const n = entry.nodes[i];
                if (!n.isRoot() && n.depth == value.depth) {
                    n.x = n.fx = data.x;
                }
            }
            if (data.width != value.max) {
                /**
                 * the changed column gets the new width directly as itself will not visibility be changed 
                 */
                data.width = value.max;

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
                                if (n.isRoot() && n.depth == object.depth) {
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

            /** draw bounding box */
            if (false) {
                ctx.fillStyle = "rgba(240,240,240,0.3)";
                const d = this.getNodesBoundingBox();
                ctx.fillRect(d.x, d.y, d.w, d.h);
            }

            for (let index = 0; index < this.rootNodes.length; index++) {
                const entry: AbstractNodeShell = this.rootNodes[index];
                ctx.save();
                ctx.translate(entry.x, entry.y);
                let nodes: AbstractNode[] = entry.nodes;
                let links: AbstractLink[] = entry.links;


                let widths: { x: number, width: number }[] = [];

                for (let i = 0, e = true; i < 40; i++) {
                    let w = this.getColumnData(entry, i, false);
                    if (w) {
                        widths[i] = w;
                    }
                    e = w != undefined;
                }
                /**
                 * Update column metrics
                 */
                // if (this.updateColumns || true) {

                //     ctx.font = `${13}px Lato`;
                //     ctx.fillStyle = "#fff";

                //     /**
                //      * collection of all column width for the current entry
                //      */
                //     let setWidths: Map<number, ColumnTextWidth> = new Map();

                //     for (let i = 0; i < nodes.length && !isShadow; i++) {
                //         const n = nodes[i];
                //         let isNodeHovered = this.nodeHovered == n;

                //         let textWidth: ColumnTextWidth | undefined = setWidths.get(n.depth);

                //         if (!textWidth) {
                //             textWidth = { min: 10000000, max: 0, depth: n.depth };
                //             textWidth = { min: 800, max: 800, depth: n.depth };
                //             setWidths.set(n.depth, textWidth);
                //         }

                //         // let textw = (Math.max(ctx.measureText(n.name).width, 250) * 2.5 + 200) * 2.2;
                //         // textWidth.max = Math.max(textWidth.max, textw);
                //         // textWidth.min = Math.min(textWidth.min, textw);

                //     }

                //     let depths: number[] = Array.from(setWidths.keys());
                //     depths.sort();

                //     for (let d = 0; d < depths.length; d++) {
                //         const element = setWidths.get(d);
                //         if (element) {
                //             this.setColumnTextWidth(entry, element);
                //         }
                //     }

                // }

                ctx.fillStyle = "rgb(170,170,170)";

                this.drawLinks(ctx, isShadow, links, widths, entry);
                this.drawNodes(ctx, isShadow, nodes, widths, entry);
                this.drawText(ctx, isShadow, nodes, widths, entry);


                if (entry && entry.columnForceMap) {

                    // const columnForces = Array.from(entry.columnForceMap.values());

                    // ctx.globalAlpha = 0.3;
                    // ctx.fillStyle = "rgb(240,0,0)";

                    // for (let i = 0; i < columnForces.length; i++) {
                    //     // all node parents for one column
                    //     const nodes = columnForces[i].nodes();

                    //     for (let j = 0; nodes && j < nodes.length; j++) {
                    //         const n = nodes[j];
                    //         const x = this.getColumnXByDepth(entry, n.depth)

                    //         // ctx. t(x, n.y ? n.y - n.radius : 0, 50, n.radius * 2);
                    //     }
                    // }
                }

                ctx.restore();
            }

        }

        ctx.restore();

        this.updateColumns = false;

        if (!isShadow && this.showShadow) {
            ctx.drawImage(this.canvasShadow, 0, 0);
        }

    }


    // nodeCulling(n: AbstractNode): boolean {

    //     let viewportWidth: number = this.size.w;
    //     let viewportHeight: number = this.size.h;

    //     let x = -(this.transform ? this.transform.x + viewportWidth / 2 : 0); // nach rechts draggen macht x kleiner, also -100 usw.
    //     let y = -(this.transform ? this.transform.y + viewportWidth / 2 : 0);  // nach unten macht y kleiner, also -100 usw.

    //     let scale = this.transform ? this.transform.k : 1;
    //     let nodeX = Math.round(n.getX()) * scale;
    //     let nodeY = Math.round(n.getY()) * scale;


    //     return (nodeX > x - viewportWidth / 2 &&
    //         nodeX < x + viewportWidth / 2 &&
    //         nodeY > y - viewportHeight / 2 &&
    //         nodeY < y + viewportHeight / 2);
    // }


    /**
     * wir speichern die farben für jede node ab und aktualisieren sie bei jedem update von nodes.
     * 
     * ändern wir die render eigenschaften, speichern wir die neuen farben in einer 2. map und erstellen
     * für jede node ein d3.scaleLinear mit den beiden farben.
     * 
     * dann starten wir ne duration mit der wir uns dann die aktuelle farbe holen. 
     * 
     * werden die render settings wieder geändert, speichern wir die aktuelle farbe bei der duration als neue start
     * farbe 
     * 
     */
    public setColorScale<N extends AbstractNode>(statAttribute: string,
        min: number, max: number,
        getColor: (node: N, stat: number, min: number, max: number) => string,
        duration: number = 40): void {

        this.colorSettings = { attr: statAttribute, min: min, max: max, colorFunction: getColor };

        for (let index = 0; index < this.rootNodes.length; index++) {
            const entry: AbstractNodeShell = this.rootNodes[index];
            let nodes: AbstractNode[] = entry.nodes;
            for (let j = 0; j < nodes.length; j++) {

                const n = nodes[j];
                const nodeValue = n.getStatsValue(this.colorSettings.attr);
                const colorOld = this.getColorForNode(n, false, false);
                if (colorOld && nodeValue != undefined) {
                    let colorNew = getColor(n as N, nodeValue, this.colorSettings.min, this.colorSettings.max);
                    colorNew = colorNew == "h" ? OverviewEngine.hiddenColor : colorNew;
                    var scale = d3.scaleLinear<string>()
                        .domain([0, duration])
                        .range([colorOld, colorNew]);
                    this.colorTransitionMap.set(n, scale);
                    this.colorNodeMap.set(n, colorNew);
                }
            }
        }

        this.colorTransitionElapsed = 1;
        this.colorTransitionTarget = duration;
    }

    private getFixedSize(value: number, min: number = value, max: number = Infinity) {
        return Math.max(min, Math.min(value / d3.zoomTransform(this.canvas).k, max));
    }

    private getRadius(node: AbstractNode, padding: number = 0, weight: number = 0.95): number {
        let scale = this.transform ? this.transform.k > 1 ? 1 : this.transform.k : 1;
        var r = node.getRadius() + padding;
        r = (r * weight) + (r / scale) * (1 - weight);
        return Math.max(1, r);
    }

    public updateNodeColorScale(node: AbstractNode | undefined = undefined): void {

        if (node) {
            const n = node;
            if (this.colorSettings) {
                const nodeValue = n.getStatsValue(this.colorSettings.attr);
                if (nodeValue != undefined) {
                    const colorNew = this.colorSettings.colorFunction(n, nodeValue, this.colorSettings.min, this.colorSettings.max);
                    this.colorNodeMap.set(n, colorNew);
                }
            }
        } else {

            for (let index = 0; index < this.rootNodes.length; index++) {
                const entry: AbstractNodeShell = this.rootNodes[index];
                let nodes: AbstractNode[] = entry.nodes;
                for (let j = 0; j < nodes.length; j++) {
                    const n = nodes[j];
                    if (this.colorSettings) {
                        const nodeValue = n.getStatsValue(this.colorSettings.attr);
                        if (nodeValue != undefined) {
                            const colorNew = this.colorSettings.colorFunction(n, nodeValue, this.colorSettings.min, this.colorSettings.max);
                            this.colorNodeMap.set(n, colorNew);
                        }
                    }
                }
            }
        }

    }

    colorSettings: ColorStatsSettings<any> | undefined;
    static hiddenColor: string = "rgb(25,25,25)";
    static colorSelection: string = "rgb(57, 215, 255)";
    colorTransitionMap: Map<AbstractNode, d3.ScaleLinear<string, string, never>> = new Map();
    colorTransitionElapsed: number | undefined = 0;
    colorTransitionTarget: number = 150;
    colorNodeDefault: string = "rgb(200,200,200)";
    colorNodeMap: Map<AbstractNode, string | "h"> = new Map();
    readonly textPadding: number = 105;
    readonly textMaxWidth: number = 200;

    private isHoveredNode(n: any) {
        return this.nodeHovered == n;
    }

    getColorForNode(node: AbstractNode, getHiddenInfo: boolean = false, hoverHighlighting: boolean = true): string {

        if (node.flag == 1) {
            // return "rgb(0,0,240)";
        }

        // when the node is faded out completly, return the default color
        const opacity = this.notFound.get(node);
        if (opacity && opacity.o == this.opacityMin) {
            return this.colorNodeDefault;
        }

        if (this.colorTransitionElapsed != undefined) {
            let scale = this.colorTransitionMap.get(node);
            if (scale) {
                const color = scale(this.colorTransitionElapsed);
                // if (hoverHighlighting && this.listnodesHovered.includes(node)) {
                //     return d3.rgb(color).brighter().formatRgb();
                // }
                return color;
            }
        } else {
            let c = this.colorNodeMap.get(node);
            if (c) {
                if (c == "h") {
                    return getHiddenInfo ? "h" : OverviewEngine.hiddenColor;
                }
                // if (hoverHighlighting && this.listnodesHovered.includes(node)) {
                //     c = d3.rgb(c).brighter().formatRgb();
                // }
                return c;
            }
        }
        // 
        // if (hoverHighlighting && this.listnodesHovered.includes(node)) {
        //     return d3.rgb(this.colorNodeDefault).brighter().formatRgb();
        // }
        return this.colorNodeDefault;
    }


    drawLinks(ctx: CanvasRenderingContext2D, isShadow: boolean = false, links: AbstractLink[], widths: { x: number, width: number }[], entry: AbstractNodeShell) {

        let scale = this.transform ? this.transform.k : 1;
        let weight = 0.7;
        let lineWidth = (4 * weight) + (4 / scale) * (1 - weight);
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

            var rStart = this.getRadius(start);
            let xStart = widths[start.depth] ? (start.isRoot() ? widths[start.depth].x : widths[start.depth].x + this.textMaxWidth) : 0;
            let xEnd = widths[end.depth] ? widths[end.depth].x - this.textMaxWidth : 0;

            var r = this.getRadius(end);

            let xEndLine = widths[end.depth] ? widths[end.depth].x - r + 1 : 0;

            if (start.isRoot()) {
                ctx.strokeStyle = "#555";
            }

            const drawCurve = () => {
                ctx.beginPath();
                ctx.moveTo(widths[start.depth] ? widths[start.depth].x + rStart : 0, start.getY());
                ctx.lineTo(xStart, start.getY());

                ctx.moveTo(xStart, start.getY());

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
                ctx.moveTo(xEnd, end.getY());
                ctx.lineTo(xEndLine, end.getY());
                ctx.stroke();
            }

            // draw selection highlighting
            if ((entry && this.selection.includes(entry.root))) {
                ctx.globalAlpha = 1;
                ctx.strokeStyle = OverviewEngine.colorSelection;
                ctx.lineWidth = lineWidth * 3.5;
                drawCurve();
            }

            let colorStart = this.getColorForNode(start);

            let colorEnd = this.getColorForNode(end, true);
            if (colorEnd == "h") {
                colorStart = colorEnd;
            }

            const grd = ctx.createLinearGradient(xStart, 0, xEnd, 0);
            // grd.addColorStop(0, "rgba(0,0,0,0.0)" );
            grd.addColorStop(0.15, colorStart);
            grd.addColorStop(0.45, colorEnd);

            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = grd;
            drawCurve();


        }
    }

    drawNodes(ctx: CanvasRenderingContext2D, isShadow: boolean = false, nodes: AbstractNode[], widths: { x: number, width: number }[], entry: AbstractNodeShell) {

        ctx.lineWidth = this.getFixedSize(12, 10, 26);
        const angle = 2 * Math.PI;
        var i = 0, len = nodes.length;
        while (i < len) {

            const node = nodes[i];

            const opacity = this.notFound.get(node);
            if (opacity) {
                ctx.globalAlpha = opacity.o;
            } else {
                ctx.globalAlpha = 1;
            }

            if (true || this.nodeFiltered.length == 0 || this.nodeFiltered.includes(node)) {

                var r = this.getRadius(node);

                if (node.isRoot() && entry.isSyncing) {
                    r += Math.sin(OverviewEngine.elapsedTotal / 300) * 20;
                }

                ctx.fillStyle = this.getColorForNode(node);
                ctx.strokeStyle = ctx.fillStyle;

                let xPos = widths[node.depth] ? widths[node.depth].x : 0;

                ctx.beginPath();

                if (node.isCollection) {
                    ctx.arc(
                        xPos, node.getY(),
                        Math.max(1, r - ctx.lineWidth / 2),
                        0, angle
                    );
                    ctx.stroke();
                } else {
                    ctx.arc(
                        xPos, node.getY(),
                        r,
                        0, angle
                    );
                    ctx.fill();
                }

                // highlight selected or hovered nodes
                if (this.nodeHovered == node || this.selection.includes(node) || (entry && this.selection.includes(entry.root))) {
                    ctx.globalAlpha = 1;
                    ctx.beginPath();
                    ctx.arc(
                        xPos, node.getY(), Math.max(1, r - ctx.lineWidth / 2),
                        0, angle
                    );
                    ctx.strokeStyle = OverviewEngine.colorSelection;
                    ctx.stroke();
                }

            }

            i++
        }

    }

    drawText(ctx: CanvasRenderingContext2D, isShadow: boolean = false, nodes: AbstractNode[], widths: { x: number, width: number }[], entry: AbstractNodeShell) {

        ctx.fillStyle = "#fff";

        let scale = this.transform ? this.transform.k : 1;

        let op: number = scale >= 0.05 && scale <= 0.1 ? (scale - 0.05) * 20 : scale < 0.1 ? 0 : 1;

        // the greater the zoom, the smaller the fontsize
        const fontSize = this.getFixedSize(20, 20, 35);

        const limitText = (text: string) => {
            let cut = false;
            while (ctx.measureText(text + "...").width > this.textMaxWidth) {
                text = text.substring(0, text.length - 1);
                cut = true;
            } return text + (cut ? "..." : "");
        }
        /**
         * Draw Folder names
         */
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            let isNodeHovered = this.isHoveredNode(node);

            var r = this.getRadius(node, 5);

            if (true || this.nodeFiltered.length == 0 || this.nodeFiltered.includes(node)) {

                let xPos = widths[node.depth] ? widths[node.depth].x : 0;

                if (!node.isRoot()) {
                    // child node
                    const opacity = this.notFound.get(node);
                    if (!opacity || this.isHoveredNode(node) || this.selection.includes(entry.root)) {
                        ctx.globalAlpha = op;
                    } else {
                        ctx.globalAlpha = opacity.o;
                    }

                    if (op > 0) {
                        ctx.textAlign = "left";

                        let translate = (fontSize) / 3;
                        ctx.font = `${fontSize}px Lato`;

                        xPos += this.textPadding;
                        let yName = node.getY() - translate;
                        this.textMaxWidth

                        ctx.fillStyle = "#fff";
                        if (this.selection.includes(node)) {
                            ctx.fillStyle = OverviewEngine.colorSelection;
                        }
                        ctx.fillText(`${node.isCollection ? "+" + (node.collectionSize) : limitText(node.name)}  `, xPos, yName);

                        if (this.colorSettings && (isNodeHovered || this.selection.includes(node))) {
                            let value = node.getStatsValue(this.colorSettings.attr);
                            let s = (value ? formatBytes(value, 2) : " - MB")
                            ctx.fillText(s.trim(), xPos, yName + translate + (fontSize + 4) * 1);
                        }

                    }

                } else {
                    // root node
                    ctx.globalAlpha = 1;
                    ctx.textAlign = "right";

                    let fontSize = this.getFixedSize(20);
                    let translate = (fontSize) / 4;
                    ctx.font = `${fontSize}px Lato`;

                    let name = (isNodeHovered || this.selection.includes(node)) && entry ? entry.path : node.name;
                    let yName = node.getY() + translate;


                    xPos -= r * 1.1;

                    ctx.fillStyle = "#fff";
                    if (this.selection.includes(node)) {
                        ctx.fillStyle = OverviewEngine.colorSelection;
                    }

                    // path
                    ctx.fillText(name, xPos, yName);

                    if (this.colorSettings) {
                        let value = node.getStatsValue(this.colorSettings.attr);
                        // feature
                        let s = (value ? formatBytes(value, 1) : " - MB")
                        ctx.fillText(s.trim(), xPos, yName + (fontSize + 4) * 1);
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