
import { ElementDimension, ElementDimensionInstance } from "@/core/utils/resize";
import * as d3 from "d3";
import {
    D3DragEvent,
    ZoomTransform,
} from "d3";
import ColorTracker from 'canvas-color-tracker';
import _ from "underscore";
import TWEEN from "@tweenjs/tween.js";
import { Tween } from "@tweenjs/tween.js";
import { Overview, Workspace } from "@/core/model/Workspace";
import { AbstractNodeShell, NodeShellListener } from "@/core/model/overview/AbstractNodeShell";
import { ipcRenderer } from "electron";
import { OV_COLUMNWIDTH } from "./OverviewEngineValues";
import { AbstractNodeFeature } from "@/core/model/overview/AbstractNodeFeatureView";
import { Layouter } from "@/core/model/overview/NodeLayout";
import { AbstractLink, AbstractNode } from "@/core/model/overview/AbstractNode";

export class OverviewEngine implements NodeShellListener<AbstractNode>{

    private static instances: OverviewEngine[] = [];
    private static started: boolean = false;
    private static fpsInterval: number = 0;
    private static now: number = 0;
    private static then: number = 0;
    private static elapsed: number = 0;
    private static elapsedTotal: number = 0;
    public static framecounter: number = 0;
    public static fpsaverage: number = 100;
    // milliseconds till last frame
    private static delta: number = 0;
    private static startClock(): void {
        OverviewEngine.fpsInterval = 1000 / 60;
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
            // prevent too large timesteps in case of slow performance
            OverviewEngine.delta = Math.min(OverviewEngine.elapsed, 10000);
            OverviewEngine.elapsedTotal += OverviewEngine.delta;

            // Get ready for next frame by setting then=now, but also adjust for your
            // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
            OverviewEngine.then = OverviewEngine.now;//- (OverviewEngine.elapsed % OverviewEngine.fpsInterval);
            OverviewEngine.framecounter++;
            TWEEN.update();
            this.fpsaverage += 1 / (this.delta / 1000);

            if (this.framecounter % 3 == 0) {
                if (this.framecounter % 100 == 0) console.log("Avg. FPS: ", Math.floor(this.fpsaverage / 3));
                this.fpsaverage = 0;
            }
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
    private _rootNodes: AbstractNodeShell[] = [];

    private nodeFilterList: Map<string, AbstractNode[]> = new Map();
    private nodeFiltered: AbstractNode[] = [];
    private notFound: Map<AbstractNode, { o: number, d: boolean }> = new Map();
    private enableCulling: boolean = true;
    transform!: ZoomTransform;
    enablePainting: boolean = true;


    mapEntryColumns: Map<number, Map<number, { x: number, width: number }>> = new Map();
    setWidthsTween: Map<AbstractNodeShell, Map<number, Tween<any>>> = new Map();

    colorChangeDuration: number = 200;
    render!: AbstractNodeFeature;

    private static opacityMin = 0.04;
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

        this.size = new ElementDimensionInstance(0, 0, 1, 1);

        /**
         * Listen for resizing of the canvas parent element
         */
        this.divObserver = new ResizeObserver(_.throttle((entries: ResizeObserverEntry[]) => {
            for (let i = 0; i < entries.length && i < 1; i++) {
                const e = entries[i];
                e.target; // div element
                let w = Math.max(2, e.contentRect.width);
                let h = Math.max(2, e.contentRect.height);

                if (this.skipInitialResize++ > 0) {
                    let diffX = this.canvas.width - w,
                        diffY = this.canvas.height - h;
                    let t = d3.zoomTransform(this.canvas);
                    this.zoom.translateBy(d3.select(this.canvas), -(diffX / 2) / t.k, -(diffY / 2) / t.k);
                }

                this.canvas.width = w, this.canvas.height = h;


                this.size.w = w;
                this.size.h = h;

            }
            this.tick();
        }, 33));
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

                    // this.fireSelectionUpdate();
                    _this.updateSelection(false);
                    // _this.overview.highlightSelection || listSelection.length == 0 ? this.setFilterList("selection") : this.setFilterList("selection", listSelection);
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
        this.zoom.scaleExtent([0.0033, 2]);
        this.zoom.on("zoom", (event: any, d: HTMLCanvasElement) => {
            let t = d3.zoomTransform(this.canvas);
            this.overview.viewportTransform = { x: t.x, y: t.y, scale: t.k };
        });
        this.zoom.on("zoom", _.throttle((event: any, d: HTMLCanvasElement) => {
            let t = d3.zoomTransform(this.canvas);
            this.overview.viewportTransform = { x: t.x, y: t.y, scale: t.k };
        }, 100));
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



        for (let i = 0; i < this.selection.length; i++) {
            const n = this.selection[i];
            this.selectionBelongingNodes.push(...n.parents(), ...n.descendants());
        }

        this.overview.highlightSelection && this.selectionBelongingNodes.length > 0 ? this.setFilterList("selection", [... this.selectionBelongingNodes]) : this.setFilterList("selection");

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
        for (let i = 0; this.transform && i < this.rootNodes.length; i++) {
            const e = this.rootNodes[i];
            if (e.quadtree) {
                let nFound: AbstractNode | undefined = e.quadtree.find(mGraph.x - e.x, mGraph.y - e.y, scale);
                if (nFound && (this.transform.k > 0.005 || nFound.isRoot())) {
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
                    this.notFound.delete(n);
                }
            }
        }


    }

    nodeAdded(node: AbstractNode) {
    }

    nodesAdded(nodes: AbstractNode[]) {
        this.updateSelection(false);
    }

    /**
      * When a node is updated, we recalculate the column widths
      */
    featuresUpdated() {
        this.updateNodeColors(undefined, false);
    }

    /**
     * When a node is updated, we recalculate the column widths
     */
    nodesUpdated() {
        this.updateNodeColors(undefined, false);
        this.updateSelection(false);
    }

    toggleCulling() {
        this.enableCulling = !this.enableCulling;
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
            }
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

    nodeCulling(n: AbstractNode): boolean {
        if (!this.enableCulling) return false;
        const viewportWidth: number = this.size.w;
        const viewportHeight: number = this.size.h;

        const screen = this.graphToScreenCoords(this.getNodeGraphCoordinates(n, OV_COLUMNWIDTH));
        const screenR = this.graphToScreenCoords(this.getNodeGraphCoordinates(n, -OV_COLUMNWIDTH));

        if (screen.x < 0 || screenR.x > viewportWidth || screen.y + 100 < 0 || screen.y - 100 > viewportHeight) {
            return true;
        }
        return false;

    }

    linkCulling(l: AbstractLink): boolean {
        if (!this.enableCulling) return false;

        const viewportWidth: number = this.size.w + 100;
        const viewportHeight: number = this.size.h + 100;

        const screenS = this.graphToScreenCoords(this.getNodeGraphCoordinates(l.source));
        const screenT = this.graphToScreenCoords(this.getNodeGraphCoordinates(l.target));

        if (
            (screenS.x + 100 < 0 && screenT.x + 100 < 0)
            || (screenS.y < 0 && screenT.y < 0)
            || (screenS.x > viewportWidth && screenT.x > viewportWidth)
            || (screenS.y > viewportHeight && screenT.y > viewportHeight)
        ) {
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
                        color = color == "h" ? OverviewEngine.hiddenColor : color;
                        this.colorNodeMap.set(node, color);
                    }
                }

            }

        }

    }

    public setFeatureRender(render: AbstractNodeFeature) {
        this.render = render;
        this.updateNodeColors();
    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return Layouter.getNodePosition(n);
    }

    private isNodeHiddenByFeature(n: AbstractNode, entry: AbstractNodeShell) {
        return this.render.isNodeHidden(n, entry);
    }

    private getFixedSize(value: number, min: number = value, max: number = Infinity) {
        return Math.max(min, Math.min(value / d3.zoomTransform(this.canvas).k, max));
    }

    private getRadius(node: AbstractNode, padding: number = 0, weight: number = 0.95): number {
        let scale = this.transform.k > 1 ? 1 : this.transform.k;
        var r = node.getRadius() + padding;
        r = (r * weight) + (r / scale) * (1 - weight);
        return Math.max(0.1, r);
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

    private drawCanvas(ctx: CanvasRenderingContext2D) {

        this.clearCanvas(ctx, this.size.w, this.size.h);

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = "rgb(30,30,30)";
        ctx.fillRect(0, 0, this.size.w, this.size.h);

        this.transform = d3.zoomTransform(this.canvas);
        ctx.translate(this.transform.x, this.transform.y);
        ctx.scale(this.transform.k, this.transform.k);

        if (this.rootNodes) {

            for (let i = 0; i < this.rootNodes.length; i++) {
                const shell: AbstractNodeShell = this.rootNodes[i];

                ctx.save();
                ctx.translate(shell.x, shell.y);
                let nodes: AbstractNode[] = shell.nodes;
                let links: AbstractLink[] = shell.links;
                var renderData: { color: any, pos: { x: number, y: number }, r: number, culling: boolean }[] = new Array(nodes.length);
                var renderDataLinks: { culling: boolean }[] = new Array(links.length);
                nodes.forEach((n, i) => {
                    renderData[i] = { color: this.getColorForNode(n), pos: this.getNodePosition(n), r: this.getRadius(n, 0, 0.99), culling: this.enableCulling ? this.nodeCulling(n) : false };
                });
                links.forEach((l, i) => {
                    renderDataLinks[i] = { culling: this.enableCulling ? this.linkCulling(l) : false };
                });

                /**
                 * Caching the x position and width of any column for performance reasons. Otherwise
                 * we would have to calculate this for each node
                 */
                let widths: { x: number }[] = [];
                for (let i = 0, e = true; i < 40; i++) {
                    let w = { x: i * OV_COLUMNWIDTH };
                    if (w) {
                        widths[i] = w;
                    }
                    e = w != undefined;
                }

                ctx.fillStyle = "rgb(170,170,170)";

                ctx.fillStyle = OverviewEngine.colorSelection;
                var r = this.getRadius(shell.root, 5);

                // if (this.selection.includes(shell.root))
                //     ctx.fillRect(
                //         r,
                //         0 - (shell.root.customData["b"] ? shell.root.customData["b"] / 2 : 0),
                //         this.getFixedSize(2),
                //         shell.root.customData["b"] ? shell.root.customData["b"] : 0);


                this.drawLinks(ctx, nodes, links, widths, shell, renderData, renderDataLinks);
                this.drawNodes(ctx, nodes, widths, shell, renderData);
                this.drawText(ctx, nodes, widths, shell, renderData);

                ctx.restore();
            }
        }

        ctx.restore();

    }

    drawLinks(ctx: CanvasRenderingContext2D, nodes: AbstractNode[], links: AbstractLink[], widths: { x: number }[], shell: AbstractNodeShell, renderData: { color: any, pos: { x: number, y: number }, r: number, culling: boolean }[], renderDataLinks: { culling: boolean }[] = new Array(links.length)) {

        let scale = this.transform ? this.transform.k : 1;
        let weight = 0.7;

        let lineWidth = (4 * weight) + (4 / scale) * (1 - weight);

        let op: number = scale >= 0.1 && scale <= 0.35 ? (scale - 0.1) * 4 : scale < 0.1 ? 0 : 1;
        op = 1 - op;
        op = Math.max(op, 0.075);
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            let start = link.source;
            let end = link.target;

            if (renderDataLinks[i].culling) continue;

            const opacity = this.notFound.get(end);
            if (opacity) {
                ctx.globalAlpha = opacity.o;
            } else {
                ctx.globalAlpha = 1;
            }

            var r = renderData[nodes.indexOf(end)].r;
            var rStart = renderData[nodes.indexOf(start)].r;
            if (start.isRoot() && shell.isSyncing) rStart += Math.sin(OverviewEngine.elapsedTotal / 300) * 20;
            // let xStart = widths[start.depth] ? (start.isRoot() ? widths[start.depth].x + rStart : widths[start.depth].x + this.textMaxWidth) : 0;
            let xStart = (start.isRoot() ? renderData[nodes.indexOf(start)].pos.x + rStart : renderData[nodes.indexOf(start)].pos.x + this.textMaxWidth);
            let xEnd = renderData[nodes.indexOf(end)].pos.x - 150;
            let xEndLine = xEnd + 150 - r + 1; // point on the next circle

            if (start.isRoot()) {
                ctx.strokeStyle = "#555";
            }

            const drawCurve = () => {
                ctx.beginPath();

                const yStart = renderData[nodes.indexOf(start)].pos.y;
                const yEnd = renderData[nodes.indexOf(end)].pos.y;

                ctx.moveTo(renderData[nodes.indexOf(start)].pos.x + rStart, yStart);
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
            if ((shell && this.selection.includes(shell.root))) {
                ctx.globalAlpha = 1;
                ctx.strokeStyle = OverviewEngine.colorSelection;
                ctx.lineWidth = lineWidth * 3.5;
                // drawCurve();
            }

            let colorStart = renderData[nodes.indexOf(start)].color;

            let colorEnd = renderData[nodes.indexOf(end)].color;
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

    drawNodes(ctx: CanvasRenderingContext2D, nodes: AbstractNode[], widths: { x: number }[], shell: AbstractNodeShell, renderData: { color: any, pos: { x: number, y: number }, r: number, culling: boolean }[]) {

        const ts = this.transform ? this.transform.k : 1;
        ctx.lineWidth = this.getFixedSize(12, 10, 40);
        const angle = 2 * Math.PI;
        var i = 0, len = nodes.length;
        while (i < len) {

            const node = nodes[i];

            var r = renderData[i].r;
            if (renderData[i].culling || r * ts < 1) { i++; continue; }

            const opacity = this.notFound.get(node);
            if (opacity) {
                ctx.globalAlpha = opacity.o;
            } else {
                ctx.globalAlpha = 1;
            }

            ctx.fillStyle = renderData[i].color;
            ctx.strokeStyle = ctx.fillStyle;

            if (node.isRoot() && shell.isSyncing) {
                const t = 0.5 * (1 + Math.sin(OverviewEngine.elapsedTotal / 300));
                r *= t + 0.01;

                var scale = d3.scaleLinear<string>()
                    .domain([0, this.colorChangeDuration])
                    .range([OverviewEngine.colorSelection, "rgb(255,255,255)"]);
                ctx.fillStyle = scale(Math.sin(t));
            }

            let xPos = renderData[i].pos.x;

            ctx.beginPath();

            if (node.isCollection()) {
                ctx.arc(
                    xPos, renderData[i].pos.y,
                    Math.max(0.1, r - ctx.lineWidth / 2),
                    0, angle
                );
                ctx.stroke();
            } else {
                ctx.arc(
                    xPos, renderData[i].pos.y,
                    r,
                    0, angle
                );
                ctx.fill();
            }

            // highlight selected or hovered nodes
            if (this.nodeHovered == node || this.selection.includes(node)) {
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.arc(
                    xPos, renderData[i].pos.y, Math.max(1, r - ctx.lineWidth / 2),
                    0, angle
                );
                ctx.strokeStyle = OverviewEngine.colorSelection;
                ctx.stroke();
            }



            i++
        }

    }

    drawText(ctx: CanvasRenderingContext2D, nodes: AbstractNode[], widths: { x: number }[], shell: AbstractNodeShell, renderData: { color: any, pos: { x: number, y: number }, r: number, culling: boolean }[]) {

        ctx.fillStyle = "#fff";

        let scale = this.transform ? this.transform.k : 1;

        let op: number = scale >= 0.05 && scale <= 0.1 ? (scale - 0.05) * 20 : scale < 0.1 ? 0 : 1;

        // the greater the zoom, the smaller the fontsize
        const fontSize = this.getFixedSize(45, 45, 80);
        const fontSize2 = this.getFixedSize(30, 30, 50);

        const limitText = (n: AbstractNode) => (n.children.length > 0 && (n.name + "...").length > 24) ? n.name.substring(0, 18) + "..." : n.name;

        /**
         * Draw Folder names
         */
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            if (renderData[i].culling) continue;

            let isNodeHovered = this.isHoveredNode(node);



            if (true || this.nodeFiltered.length == 0 || this.nodeFiltered.includes(node)) {

                let xPos = renderData[i].pos.x; widths[node.depth] ? widths[node.depth].x : 0;

                if (!node.isRoot()) {

                    if (scale < 0.025) continue;
                    // child node
                    const opacity = this.notFound.get(node);
                    if (!opacity || this.isHoveredNode(node) || this.selection.includes(shell.root)) {
                        ctx.globalAlpha = op;
                    } else {
                        ctx.globalAlpha = opacity.o;
                    }

                    if (op > 0) {
                        xPos += node.isCollection() ? this.textPadding + 45 : this.textPadding;
                        ctx.textAlign = "left";

                        ctx.fillStyle = this.isNodeHiddenByFeature(node, shell) ? OverviewEngine.hiddenColor : "#fff";
                        let translate = (fontSize) / 3;
                        ctx.font = `${fontSize}px Arial`;
                        let yName = node.children.length == 0 ? renderData[i].pos.y + (fontSize) / 4 : renderData[i].pos.y - translate;



                        if (this.selection.includes(node)) ctx.fillStyle = OverviewEngine.colorSelection;

                        ctx.fillText(`${node.isCollection() ? limitText(node) + " (+ " + (node.collectionData?.size) + ")" : limitText(node)}  `, xPos, yName);


                        ctx.fillStyle = this.isNodeHiddenByFeature(node, shell) ? OverviewEngine.hiddenColor : "#ddd";
                        translate = (fontSize2) / (node.children.length == 0 ? 8 : 3);
                        ctx.font = `${fontSize2}px Arial italic`;
                        const text = this.render.getFeatureText(node, shell);
                        if (text) ctx.fillText(text, xPos, yName + translate + (fontSize2 + 4) * 1);


                    }

                } else {
                    // root node
                    ctx.globalAlpha = 1;
                    ctx.textAlign = "right";

                    let fontSize = this.getFixedSize(20);
                    let translate = (fontSize) / 4;
                    ctx.font = `${fontSize}px Arial`;

                    let name = (isNodeHovered || this.selection.includes(node)) && shell ? shell.getName() : node.name;
                    let yName = renderData[i].pos.y + translate;

                    var r = renderData[i].r;
                    xPos -= r * 1.1;

                    ctx.fillStyle = "#fff";
                    if (this.selection.includes(node)) {
                        ctx.fillStyle = OverviewEngine.colorSelection;
                    }

                    ctx.fillText(name, xPos, yName);

                    ctx.fillStyle = this.isNodeHiddenByFeature(node, shell) ? OverviewEngine.hiddenColor : "#bbb";
                    const text = this.render.getFeatureText(node, shell);
                    if (text) ctx.fillText(text, xPos, yName + (fontSize + 4) * 1);

                }
            }


        }
        ctx.globalAlpha = 1;

    }

    private clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.restore();
    }

}