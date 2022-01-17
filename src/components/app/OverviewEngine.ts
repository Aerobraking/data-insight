
import { ElementDimension, ElementDimensionInstance } from "@/utils/resize";
import * as d3 from "d3";
import {
    D3DragEvent,
    ZoomTransform,
} from "d3";
import { AbstractNode, AbstractLink } from "../../store/model/app/overview/AbstractNode";
import ColorTracker from 'canvas-color-tracker';
import _ from "underscore";
import TWEEN from "@tweenjs/tween.js";
import { Tween } from "@tweenjs/tween.js";
import { Overview, Workspace } from "@/store/model/app/Workspace";
import { AbstractNodeShell, NodeShellListener } from "@/store/model/app/overview/AbstractNodeShell";
import { ipcRenderer } from "electron";
import { OV_COLUMNWIDTH } from "./OverviewEngineValues";
import { Feature } from "@/store/model/app/overview/AbstractNodeFeature";
import { AbstractNodeFeature } from "@/store/model/app/overview/AbstractNodeFeatureView";
import { Layouter } from "@/store/model/app/overview/NodeLayout";

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
    attr: Feature,
    min: number,
    max: number,
    colorFunction: (node: N, stat: number, min: number, max: number) => string
}

export class OverviewEngine implements NodeShellListener<AbstractNode>{


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
    public selectionBelongingNodes: AbstractNode[] = [];
    mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    autocolor: ColorTracker = new ColorTracker();
    zoom: d3.ZoomBehavior<HTMLCanvasElement, HTMLCanvasElement>;
    overview: Overview;
    workspace: Workspace;
    size: ElementDimensionInstance;
    divObserver: ResizeObserver;
    skipInitialResize: number = 0;
    canvas: HTMLCanvasElement;
    nodeHovered: AbstractNode | undefined;
    listnodesHovered: AbstractNode[] = [];
    nodeShift: AbstractNode | undefined;
    showAllTimer: NodeJS.Timeout | undefined = setInterval(() => {
        if (this.overview && this.overview.showAll && this.workspace.isActive) {
            this.setViewBox(this.getNodesBoundingBox(1.3), 500, TWEEN.Easing.Linear.None);
        }
    }, 500);

    context: CanvasRenderingContext2D;
    contextShadow: CanvasRenderingContext2D;
    canvasShadow: HTMLCanvasElement;
    public showShadow: boolean = false;
    private _rootNodes: AbstractNodeShell[] = [];

    private nodeFilterList: Map<string, AbstractNode[]> = new Map();
    private nodeFiltered: AbstractNode[] = [];
    private notFound: Map<AbstractNode, { o: number, d: boolean }> = new Map();

    transform: ZoomTransform | undefined;
    enablePainting: boolean = true;
    private static opacityMin = 0.04;

    mapEntryColumns: Map<number, Map<number, { x: number, width: number }>> = new Map();
    setWidthsTween: Map<AbstractNodeShell, Map<number, Tween<any>>> = new Map();

    colorChangeDuration: number = 200;
    render!: AbstractNodeFeature;
    static hiddenColor: string = "rgb(17,18,19)";
    static colorNodeDefault: string = "rgb(250,250,250)";
    static colorSelection: string = "rgb(57, 215, 255)";
    colorTransitionMap: Map<AbstractNode, d3.ScaleLinear<string, string, never>> = new Map();
    colorTransitionElapsed: number | undefined = 0;
    colorTransitionTarget: number = 150;
    colorNodeMap: Map<AbstractNode, string | "h"> = new Map();

    readonly textPadding: number = 105;
    readonly textMaxWidth: number = 440;


    constructor(div: HTMLElement, workspace: Workspace) {

        if (!OverviewEngine.started) {
            OverviewEngine.startClock();
            OverviewEngine.started = true;
        }

        OverviewEngine.instances.push(this);

        var _this = this;

        this.workspace = workspace;
        this.overview = workspace.overview;

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
                    return obj.shell;
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
                        if (obj instanceof AbstractNodeShell) {
                            (obj as any).__initialDragPos = { x: obj.x, y: obj.y, };
                        }

                        if (!(obj instanceof AbstractNodeShell)) {
                            const node = ev.subject as AbstractNode;
                            Layouter.nodeDragged(node, "start", undefined, d3.zoomTransform(this.canvas));

                            this.setFilterList("selection");
                        }
                    }

                })
                .on('drag', (ev: D3DragEvent<HTMLCanvasElement, unknown, any>) => {

                    if (_this.nodeShift) return;

                    const obj = ev.subject;
                    const dragPos = ev;
                    const t = d3.zoomTransform(this.canvas);

                    if (obj instanceof AbstractNodeShell) {
                        /**
                         * the root can be moved in any direction and moves the whole tree with it
                         */
                        const initPos = (obj as any).__initialDragPos;
                        let offset = { x: (dragPos.x - initPos.x) / t.k, y: (dragPos.y - initPos.y) / t.k };
                        obj.setCoordinates({ x: initPos.x + offset.x, y: initPos.y + offset.y })
                    } else {
                        Layouter.nodeDragged(ev.subject as AbstractNode, "move", dragPos, t)
                    }
                    _this.fireSelectionUpdate();

                })
                .on('end', ev => {
                    _this.pauseHovering = false;
                    this.canvas.classList.remove('grabbable');

                    const obj = ev.subject;
                    delete (obj.__initialDragPos);

                    if (obj instanceof AbstractNodeShell) return;

                    Layouter.nodeDragged(ev.subject as AbstractNode, "end", undefined, d3.zoomTransform(this.canvas))

                    const listSelection = [];
                    for (let i = 0; i < this.selection.length; i++) {
                        const n = this.selection[i];
                        listSelection.push(...n.descendants(), ...n.parents());
                    }

                    this.fireSelectionUpdate();
                    listSelection.length == 0 ? this.setFilterList("selection") : this.setFilterList("selection", listSelection);
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
        this.zoom.scaleExtent([0.01, 2]);
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

    public updateSelection(findNode: boolean = true, newSelectedNode: AbstractNode | undefined = undefined): AbstractNode | undefined {

        if (newSelectedNode) {
            this.selection = [];
            this.selectionBelongingNodes = [];
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
                this.selectionBelongingNodes = [];
                if (node) this.selection.push(node);
                // }
            }

        const descendants: any[] = [];
        this.selection.forEach(n => descendants.push(...n.descendants()));

        for (let i = 0; i < this.selection.length; i++) {
            const n = this.selection[i];
            this.selectionBelongingNodes.push(...n.parents());
        }

        this.selectionBelongingNodes.push(...descendants);
        descendants.length < 2 ? this.setFilterList("selection") : this.setFilterList("selection", [... this.selectionBelongingNodes]);
        this.fireSelectionUpdate();

        return this.selection.length > 0 ? this.selection[0] : undefined;
    }

    public clearSelection() {
        this.selection = [];
        this.selectionBelongingNodes = [];
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

    public dispose() {
        this.divObserver.disconnect();
        if (this.showAllTimer) clearTimeout(this.showAllTimer);
    }

    public getNodesBoundingBox(padding: number = 1, selection: AbstractNode | AbstractNodeShell[] | undefined = this._rootNodes): ElementDimension {


        const _this = this;
        let nodesThere = false;
        const d: ElementDimensionInstance = new ElementDimensionInstance(Infinity, Infinity, 0, 0, -Infinity, -Infinity);

        function getNodeBound(n: AbstractNode): void {

            function calc(x: number, y: number): void {
                d.x = x < d.x ? x : d.x;
                d.x2 = x > d.x2 ? x : d.x2;
                d.y = y < d.y ? y : d.y;
                d.y2 = y > d.y2 ? y : d.y2;
            }

            const p = _this.getNodePosition(n);
            const x = p.x + n.shell!.x;
            const y = p.y + n.shell!.y;
            calc(x + 50, y + 50);
            calc(x - 50, y - 50);
            nodesThere = true;
        }

        if (selection instanceof Array) {
            for (let index = 0; index < selection.length; index++) {
                selection[index].nodes.forEach(n => getNodeBound(n));
            }
        } else if (selection instanceof AbstractNode) { 
            getNodeBound(selection);
        }

        if (nodesThere) {
            d.calculateSize();
            d.scaleFromCenter(padding);
        }

        return d;
    }

    public zoomToFitSelection(duration: number = 400, useShell: boolean = true, padding: number = 1.3) {
        this.setViewBox(this.getNodesBoundingBox(padding, this.selection.length > 0 ? useShell ? [this.selection[0].shell as AbstractNodeShell] : this.selection[0] : undefined), duration);
    }

    public zoomToFit(duration: number = 400) {
        this.setViewBox(this.getNodesBoundingBox(1.3), duration);
    }

    public setViewBox(dim: ElementDimension, duration: number = 200, easing: (a: number) => number = TWEEN.Easing.Quadratic.InOut) {
        const scale = Math.min(Math.abs(this.canvas.width / dim.w), Math.abs(this.canvas.height / dim.h));
        this.setView(scale, dim.x + dim.w / 2, +dim.y + dim.h / 2, duration, easing);
    }

    public setView(scale: number | undefined = undefined, x: number, y: number,
        duration: number = 200, easing: (a: number) => number = TWEEN.Easing.Quadratic.InOut) {

        let _this = this;

        // setter
        if (_this.transform !== undefined) {

            scale = scale == undefined ? _this.transform.k : scale;

            if (duration == 0) { // no animation
                setZoom({ k: scale, x: x, y: y });
                return;
            } else {
                new TWEEN.Tween({
                    k: _this.transform.k,
                    x: (_this.size.w / 2 - _this.transform.x) / _this.transform.k,
                    y: (_this.size.h / 2 - _this.transform.y) / _this.transform.k
                })
                    .to({ k: scale, x: x, y: y }, duration)
                    .easing(easing)
                    .onUpdate((data: { k: number, x: number, y: number }) => setZoom(data))
                    .start();
            }
            return;
        }

        function setZoom(data: { k: number, x: number, y: number }) {
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
        this.updateNodeColors(node, false);
        this.updateSelection(false);
    }

    /**
     * When a node is updated, we recalculate the column widths
     */
    nodesUpdated() {
        this.updateNodeColors(undefined, false);
        this.updateSelection(false);
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
        this.updateNodeColors(undefined, false);

        this.clearSelection();
    }

    public tick(): void {


        Layouter.tick(this._rootNodes, OverviewEngine.delta);
        this._rootNodes.forEach(s => s.tick());


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
                n.o = Math.min(1, Math.max(OverviewEngine.minOpacity, n.o));
                if (n.o >= 1) this.notFound.delete(listOpacity[i]);
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

    private static minOpacity: number = 0.045;

    private getNodeGraphCoordinates(n: AbstractNode, offsetX = 0, offsetY = 0): { x: number, y: number } {
        return n.shell ? { x: n.shell.x + this.getNodePosition(n).x + offsetX, y: n.shell.y + this.getNodePosition(n).y + offsetY } : { x: 0, y: 0 };
    }

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

            for (let i = 0; i < this.rootNodes.length; i++) {
                const entry: AbstractNodeShell = this.rootNodes[i];

                // if (this.selection.includes(entry.root)) {
                //     ctx.strokeStyle =OverviewEngine.colorSelection;
                //     ctx.lineWidth=this.getFixedSize(4);
                //     const d = this.getNodesBoundingBox(1.3,[entry]);
                //     ctx.strokeRect(d.x, d.y, d.w, d.h);
                // }

                ctx.save();
                ctx.translate(entry.x, entry.y);
                let nodes: AbstractNode[] = entry.nodes;
                let links: AbstractLink[] = entry.links;

                /**
                 * Caching the x position and width of any column for performance reasons. Otherwise
                 * we would have to calculate this for each node
                 */
                let widths: { x: number, width: number }[] = [];
                for (let i = 0, e = true; i < 40; i++) {
                    let w = { x: i * OV_COLUMNWIDTH, width: OV_COLUMNWIDTH };
                    if (w) {
                        widths[i] = w;
                    }
                    e = w != undefined;
                }

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


        if (!isShadow && this.showShadow) {
            ctx.drawImage(this.canvasShadow, 0, 0);
        }

    }

    nodeCulling(n: AbstractNode): boolean {

        const viewportWidth: number = this.size.w;
        const viewportHeight: number = this.size.h;

        const screen = this.graphToScreenCoords(this.getNodeGraphCoordinates(n, OV_COLUMNWIDTH));
        const screenR = this.graphToScreenCoords(this.getNodeGraphCoordinates(n, -OV_COLUMNWIDTH));

        if (screen.x < 0 || screenR.x > viewportWidth || screen.y + 100 < 0 || screen.y - 100 > viewportHeight) {
            return true;
        }
        return false;

    }

    public updateNodeColors(node: AbstractNode | undefined = undefined, transition: boolean = true): void {

        if (node) {

            if (transition) {

                const colorOld = this.getColorForNode(node);
                let colorNew = this.render.getNodeColor(node, node.shell as AbstractNodeShell);

                var scale = d3.scaleLinear<string>()
                    .domain([0, this.colorChangeDuration])
                    .range([colorOld, colorNew]);
                this.colorTransitionMap.set(node, scale);
                this.colorNodeMap.set(node, colorNew);

                this.colorTransitionElapsed = 1;
                this.colorTransitionTarget = this.colorChangeDuration;

            } else {
                let color = this.render.getNodeColor(node, node.shell as AbstractNodeShell);
                this.colorNodeMap.set(node, color);
            }

        } else {

            if (transition) {

                for (let i = 0; i < this.rootNodes.length; i++) {
                    const entry: AbstractNodeShell = this.rootNodes[i];
                    let nodes: AbstractNode[] = entry.nodes;
                    for (let j = 0; j < nodes.length; j++) {
                        const node = nodes[j];
                        const colorOld = this.getColorForNode(node);

                        if (colorOld) {
                            let colorNew = this.render.getNodeColor(node, entry);
                            colorNew = colorNew == "h" ? OverviewEngine.hiddenColor : colorNew;
                            var scale = d3.scaleLinear<string>()
                                .domain([0, this.colorChangeDuration])
                                .range([colorOld, colorNew]);
                            this.colorTransitionMap.set(node, scale);
                            this.colorNodeMap.set(node, colorNew);
                        }
                    }
                }

                this.colorTransitionElapsed = 1;
                this.colorTransitionTarget = this.colorChangeDuration;

            } else {

                for (let index = 0; index < this.rootNodes.length; index++) {
                    const entry: AbstractNodeShell = this.rootNodes[index];
                    let nodes: AbstractNode[] = entry.nodes;
                    for (let j = 0; j < nodes.length; j++) {
                        const node = nodes[j];
                        let color = this.render.getNodeColor(node, entry);
                        this.colorNodeMap.set(node, color == "h" ? OverviewEngine.hiddenColor : color);
                    }
                }

            }

        }

    }

    public setFeatureRender(render: AbstractNodeFeature) {
        this.render = render;
        this.updateNodeColors();
    }

    private getNodePosition(n: AbstractNode): { x: number, y: number } {
        return Layouter.getNodePosition(n);
        // return  { x: n.getX(), y: n.getY() };
    }

    private isNodeHiddenByFeature(n: AbstractNode, entry: AbstractNodeShell) {
        return this.render.isNodeHidden(n, entry);
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

    private isHoveredNode(n: any) {
        return this.nodeHovered == n;
    }

    getColorForNode(node: AbstractNode): string {

        // when the node is faded out completly, return the default color
        const opacity = this.notFound.get(node);
        if (opacity && opacity.o == OverviewEngine.opacityMin) {
            return OverviewEngine.hiddenColor;
        }

        if (this.colorTransitionElapsed != undefined) {
            let scale = this.colorTransitionMap.get(node);
            if (scale) return scale(this.colorTransitionElapsed);
        } else {
            let c = this.colorNodeMap.get(node);
            if (c) return c;
        }
        return OverviewEngine.colorNodeDefault;
    }

    drawLinks(ctx: CanvasRenderingContext2D, isShadow: boolean = false, links: AbstractLink[], widths: { x: number, width: number }[], entry: AbstractNodeShell) {

        let scale = this.transform ? this.transform.k : 1;
        let weight = 0.7;

        let lineWidth = (4 * weight) + (4 / scale) * (1 - weight);
        if (entry.isSyncing) lineWidth += Math.sin(OverviewEngine.elapsedTotal / 300) * 10;
        let op: number = scale >= 0.1 && scale <= 0.35 ? (scale - 0.1) * 4 : scale < 0.1 ? 0 : 1;
        op = 1 - op;
        op = Math.max(op, 0.075)

        for (let i = 0; i < links.length; i++) {
            const n = links[i];
            let start = n.source;
            let end = n.target;

            if (this.nodeCulling(start) && this.nodeCulling(end)) continue;

            const opacity = this.notFound.get(end);
            if (!isShadow && opacity) {
                ctx.globalAlpha = opacity.o;
            } else {
                ctx.globalAlpha = 1;
            }

            var r = this.getRadius(end);
            var rStart = this.getRadius(start);
            if (start.isRoot() && entry.isSyncing) rStart += Math.sin(OverviewEngine.elapsedTotal / 300) * 20;
            let xStart = widths[start.depth] ? (start.isRoot() ? widths[start.depth].x + rStart : widths[start.depth].x + this.textMaxWidth) : 0;
            let xEnd = widths[end.depth] ? widths[end.depth].x - r - 10 : 0;
            let xEndLine = widths[end.depth] ? widths[end.depth].x - r + 1 : 0; // point on the next circle

            if (start.isRoot()) {
                ctx.strokeStyle = "#555";
            }

            const drawCurve = () => {
                ctx.beginPath();

                const yStart = this.getNodePosition(start).y;
                const yEnd = this.getNodePosition(end).y;

                ctx.moveTo(widths[start.depth] ? widths[start.depth].x + rStart : 0, this.getNodePosition(start).y);
                ctx.lineTo(xStart, yStart);

                const midX = (xStart + xEnd) / 2;
                ctx.bezierCurveTo(
                    midX,
                    yStart,
                    midX,
                    yEnd,
                    xEnd,
                    yEnd
                );

                ctx.moveTo(xEnd, yEnd);
                ctx.lineTo(xEndLine, yEnd);

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

            let colorEnd = this.getColorForNode(end);
            if (colorEnd == OverviewEngine.hiddenColor) {
                // colorStart = colorEnd;
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

            if (this.nodeCulling(node)) { i++; continue; }

            const opacity = this.notFound.get(node);
            if (opacity) {
                ctx.globalAlpha = opacity.o;
            } else {
                ctx.globalAlpha = 1;
            }

            if (true || this.nodeFiltered.length == 0 || this.nodeFiltered.includes(node)) {

                var r = this.getRadius(node);

                ctx.fillStyle = this.getColorForNode(node);
                ctx.strokeStyle = ctx.fillStyle;

                if (node.isRoot() && entry.isSyncing) r += Math.sin(OverviewEngine.elapsedTotal / 300) * 20;

                let xPos = widths[node.depth] ? widths[node.depth].x : 0;

                ctx.beginPath();

                if (node.isCollection() && node.collectionData!.size > 0) {
                    ctx.arc(
                        xPos, this.getNodePosition(node).y,
                        Math.max(1, 100 - ctx.lineWidth / 2),
                        0, angle
                    );
                    ctx.stroke();
                } else {
                    ctx.arc(
                        xPos, this.getNodePosition(node).y,
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
                        xPos, this.getNodePosition(node).y, Math.max(1, r - ctx.lineWidth / 2),
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

        const limitText = (text: string) => ((text + "...").length > 24) ? text.substring(0, 18) + "..." : text;

        /**
         * Draw Folder names
         */
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            if (this.nodeCulling(node)) continue;

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
                        let yName = node.children.length == 0 ? this.getNodePosition(node).y + (fontSize) / 4 : this.getNodePosition(node).y - translate;

                        ctx.fillStyle = this.isNodeHiddenByFeature(node, entry) ? OverviewEngine.hiddenColor : "#fff";

                        if (this.selection.includes(node)) ctx.fillStyle = OverviewEngine.colorSelection;

                        ctx.fillText(`${node.isCollection() ? limitText(node.name) + " (+ " + (node.collectionData?.size) + ")" : limitText(node.name)}  `, xPos, yName);

                        if (true || (isNodeHovered || this.selection.includes(node) || this.selectionBelongingNodes.includes(node))) {
                            const text = this.render.getFeatureText(node, entry);
                            if (text) ctx.fillText(text, xPos, yName + translate + (fontSize + 4) * 1);
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
                    let yName = this.getNodePosition(node).y + translate;

                    xPos -= r * 1.1;

                    ctx.fillStyle = "#fff";
                    if (this.selection.includes(node)) {
                        ctx.fillStyle = OverviewEngine.colorSelection;
                    }

                    // path
                    ctx.fillText(name, xPos, yName);


                    const text = this.render.getFeatureText(node, entry);
                    if (text) ctx.fillText(text, xPos, yName + (fontSize + 4) * 1);


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