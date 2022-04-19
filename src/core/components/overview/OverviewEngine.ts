
import { ElementDimension, ElementDimensionInstance } from "@/core/utils/ResizeUtils";
import * as d3 from "d3";
import { D3DragEvent, ZoomTransform } from "d3";
import _ from "underscore";
import TWEEN from "@tweenjs/tween.js";
import { Overview, Workspace } from "@/core/model/workspace/Workspace";
import { AbstractNodeTree, NodeTreeListener } from "@/core/model/workspace/overview/AbstractNodeTree";
import { ipcRenderer } from "electron";
import { AbstractFeature } from "@/core/model/workspace/overview/AbstractFeature";
import { Layouter, MIN_TREE_COLUMN_WIDTH } from "@/core/model/workspace/overview/NodeLayout";
import { AbstractLink, AbstractNode } from "@/core/model/workspace/overview/AbstractNode";
import { doBenchmark, logTime as logTime, tickEnd, tickStart } from "@/core/utils/Benchmark";
import { removeFromList } from "@/core/utils/ListUtils";

/**
 * The OverviewView Component is responsible for the Rendering of the Overview Data.
 * As the actual Rendering of the Data in the Canvas is quite complex, it is wrapped in 
 * this Class, so the Component Code can be slim and only for the other UI elements of 
 * the Overview.
 * So OverviewView creates one Instance of this class to render the Data.
 * This class also takes care for the clocking of the rendering by 
 * creating a loop with the requestAnimationFrame() that calls the render method
 * for each OverviewEngine Instance.
 */
export class OverviewEngine implements NodeTreeListener<AbstractNode>{

    /**
     * Array of active OverviewEngine Instances.
     */
    private static instances: OverviewEngine[] = [];

    /**
     * true: The loop that calls tick() frequently has been started.
     */
    private static clockStarted: boolean = false;

    /**
     * When true, the benchmark log will be printed once and the property will be set to false again.
     */
    private static printlog: boolean = false;

    /**
     * Maximum Frames per second when the app window is focused.
     */
    private static fpsInterval: number = 1000 / 60;

    /**
     * Maximum Frames per second when the app window is not focused.
     */
    private static fpsIntervalLow: number = 1000 / 24;

    /**
     * Some values to calculate the time between the ticks. 
     */
    private static now: number = 0;
    private static then: number = 0;
    private static elapsed: number = 0;
    private static elapsedTotal: number = 0;

    /**
     * How many times a tick was called since the clocking started.
     */
    public static framecounter: number = 0;

    /**
     * milliseconds till last frame
     */
    private static delta: number = 0;

    /**
     * Starts the tick loop. Has to be called only once.
     */
    private static startClock(): void {
        OverviewEngine.then = performance.now();
        OverviewEngine.tick();
        OverviewEngine.clockStarted = true;
    }

    /**
     * Call this method to print the Benchmark log once.
     */
    public static printLog() {
        OverviewEngine.printlog = true;
    }

    /**
     * This method is called in a loop by using requestAnimationFrame().
     * It calls the tick() method for all active OverviewEngine Instances.
     */
    private static tick(): void {

        // calculate elapsed time since last loop.
        OverviewEngine.now = performance.now();
        OverviewEngine.elapsed = OverviewEngine.now - OverviewEngine.then;

        requestAnimationFrame(OverviewEngine.tick.bind(this));

        // if enough time has elapsed to target the desired framerate, call tick() on each Instance.
        if (OverviewEngine.elapsed > (document.hasFocus() ? OverviewEngine.fpsInterval : OverviewEngine.fpsIntervalLow)) {
            tickStart();

            // prevent too large timesteps in case of slow performance
            OverviewEngine.delta = Math.min(OverviewEngine.elapsed, 2000);
            OverviewEngine.elapsedTotal += OverviewEngine.delta;

            // Get ready for next frame by setting then=now, but also adjust for your
            // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
            OverviewEngine.then = OverviewEngine.now - (OverviewEngine.elapsed % OverviewEngine.fpsInterval);

            if (doBenchmark) logTime("tick");
            for (let i = 0; i < OverviewEngine.instances.length; i++) {
                const inst = OverviewEngine.instances[i];
                inst.tickEngine();
            }

            // For the animation of the colors, we update the Tween Instance.
            TWEEN.update();
            tickEnd(OverviewEngine.printlog);
            OverviewEngine.framecounter++;
            if (OverviewEngine.printlog) OverviewEngine.printlog = false;
        }

    }

    /**
     * true: Disables the Hovering of nodes, so nodeHovered will always be undefined.
     */
    pauseHovering: boolean = false;

    /**
     * The array of selected Nodes. In the Moment it contains at most one node.
     */
    public selection: AbstractNode[] = [];

    /**
     * An array that contain all descendants and ancestor nodes of the selected nodes in the "selection" array.
     */
    public selectionBelongingNodes: AbstractNode[] = [];

    /**
     * The current mouse position relative to the canvas element.
     */
    mousePosition: { x: number, y: number } = { x: 0, y: 0 };

    /**
     * The d3 Instance that takes care of the scaling/translating of the Canvas Space.
     */
    zoom: d3.ZoomBehavior<HTMLCanvasElement, HTMLCanvasElement>;

    /**
     * The overview and workspace Instances this Engine uses for rendering.
     */
    overview: Overview;
    workspace: Workspace;

    /**
     * The size of the Canvas Element.
     */
    canvasSize: ElementDimensionInstance;

    /**
     * Observes changes of the Canvas size to update the canvasSize property.
     */
    canvasObserver: ResizeObserver;

    /**
     * We skip the first resize Event for this Canvas because this can trigger
     * errors in the Rendering.
     */
    skipInitialResize: number = 0;

    /**
     * The Canvas Element that is added to the OverviewView and the and the Context Instance of it.
     */
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;

    /**
     * The node that is currently hovered with the mouse. undefined, when no node
     * is hovered. There is a maximum distance between the mouse position and a node
     * to set a node as hovered.
     */
    nodeHovered: AbstractNode | undefined;

    /**
     * An array that contain all descendants and ancestor nodes of the node in the nodeHovered property.
     */
    listnodesHovered: AbstractNode[] = [];

    /**
     * The node that was selected when a drag operations starts while Shift is pressed.
     * Is set to undefined when a drag starts without Shift being pressed.
     */
    nodeShift: AbstractNode | undefined;

    /**
     * The Data of the Overview this Engine uses for rendering.
     */
    private _trees: AbstractNodeTree[] = [];

    /**
     * This array contains all nodes that fit to the current filters. When the array is empty
     * no filter is active and all nodes should be rendered.
     */
    private nodesFiltered: AbstractNode[] = [];

    /**
     * This map contains all lists that contains the filtered nodes. So when you have multiple lists,
     * only the nodes that a found in all lists will be rendered.
     */
    private nodeFilterList: Map<string, AbstractNode[]> = new Map();

    /**
     * All nodes that does not fit to the active filtering will get an entry in this map
     * that contains the opacity value (0...1) for this node. Is used for animating the 
     * fading out of the node. 
     * When a node should be rendered again and reaches opacity of 1, it is removed from the map.
     * @param o the opacity value
     * @param direction true: the opacity value will be increased, false the value will be decreased. 
     */
    private notFound: Map<AbstractNode, { o: number, direction: boolean }> = new Map();

    /**
     * true: Culling will be used when rendering the nodes
     * false: No Cullind will be used
     */
    private enableCulling: boolean = true;

    /**
     * The current transformation of the Canvas space.
     */
    private transform!: ZoomTransform;

    /**
     * true: This Instance can render the data. But there are other condition that have to be fullfilled
     * so that the rendering really happens.
     * false: This Instance won't render the data no matter what.
     */
    enableRendering: boolean = true;

    /**
     * How many milliseconds should it take to fade out/in the nodes when filtering does happen.
     */
    private colorChangeDuration: number = 200;

    /**
     * The active Feature that takes care of the rendering of the nodes.
     */
    public featureRenderer!: AbstractFeature;

    /**
     * The minimum opacity that is not undercut when fading out a node.
     */
    private static opacityMin = 0.04;

    /**
     * The color that is used for a node when it is hidden by the filtering.
     */
    private static hiddenColor: string = "rgb(17,18,19)";

    /**
     * The default color for a node when no Color can be obtained by the activeFeatureRender.
     */
    private static colorNodeDefault: string = "rgb(250,250,250)";

    /**
     * The color for a node when the node is selected.
     */
    private static colorSelection: string = "rgb(57, 215, 255)";

    /**
     * The Rendering animates the changing of colors for the nodes. For that the old and new
     * colors are saved in this map for each node as a ScaleLinear Object of d3 that returns the
     * fitting color string for a linear value between 0...1.
     */
    colorTransitionMap: Map<AbstractNode, d3.ScaleLinear<string, string, never>> = new Map();

    /**
     * The elapsed time when starting a color transition for the nodes.
     */
    colorTransitionElapsed: number | undefined = 0;

    /**
     * The time a color transition takes.
     */
    colorTransitionTarget: number = 150;

    /**
     * This map contains the current color for each node.
     */
    colorNodeMap: Map<AbstractNode, string | "h"> = new Map();

    /**
     * How many pixels are additional used for the horizontal line of the curve of a node link before the curve starts.
     * So the curve does not overlap with the text.
     */
    readonly textPadding: number = 105;

    /**
     * How many pixels are used for the horizontal line of the curve of a node link before the curve starts.
     * So the curve does not overlap with the text.
     */
    readonly textMaxWidth: number = 440;

    constructor(div: HTMLElement, workspace: Workspace) {

        var _this = this;

        // start the Clocking when not started yet
        if (!OverviewEngine.clockStarted) {
            OverviewEngine.startClock();
        }

        // add this Instance to the active list so it tick() method will be called.
        OverviewEngine.instances.push(this);

        this.workspace = workspace;
        this.overview = workspace.overview;

        /**
         * Create the Canvas Object and the Context for it.
         */
        let c = d3.select(div).append("canvas").attr("width", div.clientWidth)
            .attr("height", div.clientHeight).attr("class", "overview-canvas")
            .node();
        this.canvas = c ? c : new HTMLCanvasElement();
        let context = this.canvas.getContext("2d", { alpha: false });
        this.context = context ? context : new CanvasRenderingContext2D();

        this.canvasSize = new ElementDimensionInstance(0, 0, 1, 1);

        /**
         * Listen for Resizing of the canvas parent element to update the cached Dimensions of the Canvas.
         */
        this.canvasObserver = new ResizeObserver(_.throttle((entries: ResizeObserverEntry[]) => {
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

                this.canvasSize.w = w;
                this.canvasSize.h = h;

            }
            this.tickEngine();
        }, 33));
        this.canvasObserver.observe(div);

        /**
         * Zoom to the location on the canvas where a double click happened.
         */
        d3.select(this.canvas).on('dblclick', function (e: MouseEvent) {

            var rect = _this.canvas.getBoundingClientRect();
            // update saved internal canvas mouse position
            _this.mousePosition = { x: e.clientX - rect.left, y: e.clientY - rect.top };

            let pos = _this.screenToGraphCoords(e);

            _this.setView(1, pos.x, pos.y, 400);
        });

        /**
         * Update the node selection and prepare the OS drag operation when shift is pressed 
         */
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
                const node = this.getNodeAtMousePosition();
                // when the root node is dragged, use the tree instance as the drag object.
                if (node && node.isRoot()) {
                    return node.tree;
                }
                return node;
            }).on('start', (ev: D3DragEvent<HTMLCanvasElement, unknown, any>) => {

                /**
                 * We pass the dragging start data to the current Layouter Instance.
                 */

                const obj = ev.subject;

                _this.nodeShift = undefined;
                if (ev.sourceEvent.altKey) {
                    _this.nodeShift = obj instanceof AbstractNodeTree ? undefined : obj;
                    return;
                } else {
                    this.canvas.classList.add('grabbable');
                    _this.pauseHovering = true;
                    if (obj instanceof AbstractNodeTree) {
                        (obj as any).__initialDragPos = { x: obj.x, y: obj.y, };
                    }

                    if (!(obj instanceof AbstractNodeTree)) {
                        const node = ev.subject as AbstractNode;
                        Layouter.nodeDragged(node, "start", undefined, d3.zoomTransform(this.canvas));

                        this.setFilterList("selection");
                    }
                }

            }).on('drag', (ev: D3DragEvent<HTMLCanvasElement, unknown, any>) => {

                // when shift is clicked a OS Drag operation is happening.
                if (_this.nodeShift) return;

                /**
                 * Pass the drag data to the current Layouter Instance.
                 */
                const obj = ev.subject;
                const dragPos = ev;
                const t = d3.zoomTransform(this.canvas);

                if (obj instanceof AbstractNodeTree) {
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

            }).on('end', ev => {

                /**
                 * Pass the drag data to the current Layouter Instance.
                 */

                _this.pauseHovering = false;
                this.canvas.classList.remove('grabbable');

                const obj = ev.subject;
                delete (obj.__initialDragPos);

                if (obj instanceof AbstractNodeTree) return;

                Layouter.nodeDragged(ev.subject as AbstractNode, "end", undefined, d3.zoomTransform(this.canvas))

                const listSelection = [];
                for (let i = 0; i < this.selection.length; i++) {
                    const n = this.selection[i];
                    listSelection.push(...n.getDescendants(), ...n.getAncestors());
                }

                _this.updateSelection(false);
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

        /**
         * Set some settings and makes sure the hoverfeature is disabled under specific user inputs.
         */
        this.zoom.translateTo(d3.select(this.canvas), this.overview.viewportTransform.x, this.overview.viewportTransform.y);
        this.zoom.scaleTo(d3.select(this.canvas), this.overview.viewportTransform.scale);
        this.zoom.scaleExtent([0.001, 2]);
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

    /**
     * 
     * @param findNode true: Determine the current nearest node to the mouse cursor, 
     * false: no node will be determined, in this case pass the node to be selected 
     * as the newSelectedNode parameter
     * @param newSelectedNode The node that will be selected. When false and findNode is true, the node will be determined.
     * @returns The selected node or undefined when no node is selected.
     */
    public updateSelection(findNode: boolean = true, newSelectedNode: AbstractNode | undefined = undefined): AbstractNode | undefined {

        if (newSelectedNode) {
            this.selection = [];
            this.selectionBelongingNodes = [];
            this.selection.push(newSelectedNode);
        } else {
            if (findNode) {
                const node: AbstractNode | undefined = this.getNodeAtMousePosition();
                this.selection = [];
                this.selectionBelongingNodes = [];
                if (node) this.selection.push(node);
            }
        }

        for (let i = 0; i < this.selection.length; i++) {
            const n = this.selection[i];
            this.selectionBelongingNodes.push(...n.getAncestors(), ...n.getDescendants());
        }

        this.overview.highlightSelection && this.selectionBelongingNodes.length > 0 ? this.setFilterList("selection", [... this.selectionBelongingNodes]) : this.setFilterList("selection");

        this.fireSelectionUpdate();

        return this.selection.length > 0 ? this.selection[0] : undefined;
    }

    /**
     * Remove any selected node from the selection and fire an update.
     */
    public clearSelection() {
        this.selection = [];
        this.selectionBelongingNodes = [];
        this.setFilterList("selection");
        this.fireSelectionUpdate();
    }

    /**
     * Fire a selection update to the listener of this Instance.
     */
    private fireSelectionUpdate() {
        this.selectionListener ?
            this.selectionListener(this.selection.length > 0 ? this.selection[0] : undefined) : 0;
    }

    /**
     * A listener Instance that can listen to node selection change events for this OverviewEngine Instance.
     */
    private selectionListener: ((n: AbstractNode | undefined) => void) | undefined = undefined;

    /**
     * The Listener Instance.
     * @param l the listener instance.
     */
    public setSelectionListener(l: (n: AbstractNode | undefined) => void) {
        this.selectionListener = l;
    }

    /**
     * Determines the closes node to the current mouse position in the canvas.
     * Uses a maximum distance that changes with the scaling of the Canvas space.
     * @returns The determined node or undefined when no node could be found.
     */
    public getNodeAtMousePosition(): AbstractNode | undefined {

        let mGraph = this.screenToGraphCoords(this.mousePosition);
        let scale = this.transform ? Math.max(40 / this.transform.k, 100) : 200;
        let n = undefined;
        for (let i = 0; this.transform && i < this.trees.length; i++) {
            const e = this.trees[i];
            if (e.quadtree) {
                let nFound: AbstractNode | undefined = e.quadtree.find(mGraph.x - e.x, mGraph.y - e.y, scale);
                if (nFound && (this.transform.k > 0.005 || nFound.isRoot())) {
                    n = nFound;
                }
            }

        }

        return n;
    };

    /**
     * Converts the given position from canvas space to screen space.
     * @param c The position in canvas space you want to convert
     * @returns The converted position in screen space.
     */
    public graphToScreenCoords(c: MouseEvent | { x: number, y: number }) {
        const t = d3.zoomTransform(this.canvas);
        if (c instanceof MouseEvent) {
            return { x: c.clientX * t.k + t.x, y: c.clientY * t.k + t.y };
        } else {
            return { x: c.x * t.k + t.x, y: c.y * t.k + t.y };
        }
    }

    /**
  * Converts the given position from screen space to canvas space.
  * @param c The position in screen space you want to convert
  * @returns The converted position in canvas space.
  */
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

    /**
     * Call this when the OverviewEngine has to stop working. It won't be called 
     * anymore in the tick loop.
     */
    public dispose() {
        this.canvasObserver.disconnect();
        removeFromList(OverviewEngine.instances, this);
    }

    /**
     * 
     * @param padding how many percentage should be added to each side of the bounding box. 1.1 means 10% are added an so on.
     * @param selection A node or a tree for which the Boundingbox will be calculated.
     * @returns The Boundingbox.
     */
    public getNodesBoundingBox(padding: number = 1, selection: AbstractNode | AbstractNodeTree[] | undefined = this._trees): ElementDimension {

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

            const p = n.customData["co"];
            const x = p.x + n.tree!.x;
            const y = p.y + n.tree!.y;
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

    /**
     * Updates the transformation with an animation so it fits to the selected node or the tree it belongs to
     * @param duration How long should the transformation animation run.
     * @param useTree true: Use the tree of the node for fitting, false: the node is used.
     * @param padding The extra padding for the viewport in percentage.
     */
    public zoomToFitSelection(duration: number = 400, useTree: boolean = true, padding: number = 1.3) {
        this.setViewBox(this.getNodesBoundingBox(padding, this.selection.length > 0 ? useTree ? [this.selection[0].tree as AbstractNodeTree] : this.selection[0] : undefined), duration);
    }

    /**
     * Updates the transformation so alle existing nodes in the overview will be visible.
     * @param duration How long should the animation run.
     */
    public zoomToFitAll(duration: number = 400) {
        this.setViewBox(this.getNodesBoundingBox(1.3), duration);
    }

    /**
     * Updates the transformation so shows the given rectangle.
     * @param dim The rectangle that will be shown in the viewport.
     * @param duration How long takes the animation.
     * @param easing What kind of TWEEN.Easing will be used for the animation.
     */
    private setViewBox(dim: ElementDimension, duration: number = 200, easing: (a: number) => number = TWEEN.Easing.Quadratic.InOut) {
        const scale = Math.min(Math.abs(this.canvas.width / dim.w), Math.abs(this.canvas.height / dim.h));
        this.setView(scale, dim.x + dim.w / 2, +dim.y + dim.h / 2, duration, easing);
    }

    /**
     * Changes the transformation of the canvas space with an animation.
     * @param scale The scaling factor that should be used for the target transformation.
     * @param x the x center coordinate for the viewport for the target transformation.
     * @param y the y center coordinate for the viewport for the target transformation.
     * @param duration How long takes the animation.
     * @param easing What kind of TWEEN.Easing will be used for the animation.
     */
    public setView(scale: number | undefined = undefined, x: number, y: number,
        duration: number = 200, easing: (a: number) => number = TWEEN.Easing.Quadratic.InOut): void {

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
                    x: (_this.canvasSize.w / 2 - _this.transform.x) / _this.transform.k,
                    y: (_this.canvasSize.h / 2 - _this.transform.y) / _this.transform.k
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

    /**
     * Determines the currently hovered node.
     * @param _this 
     */
    hoverFinder(_this: this) {
        if (!this.pauseHovering && _this.mousePosition && _this.mousePosition.x >= 0 && _this.mousePosition.y >= 0) {

            let n: AbstractNode | undefined = this.getNodeAtMousePosition();

            _this.canvas.style.cursor = _this.nodeHovered ? "move" : "auto";

            if (n) {
                if (n != _this.nodeHovered) {
                    _this.nodeHovered = n;
                    _this.listnodesHovered = [];
                    _this.listnodesHovered.push(...n.getDescendants(), ...n.getAncestors());
                }
            } else {
                _this.nodeHovered = undefined;
                _this.setFilterList("hover");
                _this.listnodesHovered = [];
            }
        }
    };

    /**
     * Add a filter list for the rendering of the node. When a key is passed with an empty array, this list
     * is removed from the filtering mechanic.
     * @param key the key that identifies this filter list. For example "search" of "hovering".
     * @param listNodes The nodes that should be rendered, all other nodes will be faded out.
     */
    public setFilterList(key: string, listNodes: AbstractNode[] | undefined = undefined) {

        if (listNodes) {
            this.nodeFilterList.set(key, listNodes);
        } else {
            this.nodeFilterList.delete(key);
        }

        this.nodesFiltered = [];

        let lists: AbstractNode[][] = Array.from(this.nodeFilterList.values());

        if (lists.length > 0) {
            this.nodesFiltered = lists[0];
            for (let i = 1; i < lists.length; i++) {
                this.nodesFiltered = this.nodesFiltered.filter(value => lists[i].includes(value));
            }
        }

        if (this.nodesFiltered.length > 0) {
            // search for new nodes that will be blending out or in
            for (let index = 0; index < this.trees.length; index++) {
                const entry = this.trees[index] as AbstractNodeTree;

                for (let j = 0; j < entry.nodes.length; j++) {
                    const n = entry.nodes[j];

                    if (!this.nodesFiltered.includes(n)) {
                        if (!this.notFound.has(n)) {
                            // add it to blending out when not already in
                            this.notFound.set(n, { o: 1, direction: false });
                        } else {
                            // node is in blending mode, so make it blending out
                            let o = this.notFound.get(n)?.o;
                            o = o ? o : 0;
                            this.notFound.set(n, { o, direction: false });
                        }
                    } else {
                        if (this.notFound.has(n)) {
                            // node is in blending mode, so make it blending in
                            let o = this.notFound.get(n)?.o;
                            o = o ? o : 0;
                            this.notFound.set(n, { o, direction: true });
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
                    n.direction = true;
                    this.notFound.set(listOpacity[i], n);
                }
            }
        }

        if (listNodes) {
            for (let i = 0; i < listNodes.length; i++) {
                const n = listNodes[i];
                if (this.nodesFiltered.includes(n)) {
                    this.notFound.delete(n);
                }
            }
        }


    }

    nodeAdded(node: AbstractNode) { }

    /**
     * When nodes are added, the selection rendering may need an update.
     * @param nodes 
     */
    nodesAdded(nodes: AbstractNode[]) {
        this.updateSelection(false);
    }

    /**
      * When a node is updated, we recalculate the node colors.
      */
    featuresUpdated() {
        this.updateNodeColors(undefined, false);
    }

    /**
     * When a node is updated, we recalculate the node colors and the selection.
     */
    nodesUpdated() {
        this.updateNodeColors(undefined, false);
        this.updateSelection(false);
    }

    toggleCulling() {
        this.enableCulling = !this.enableCulling;
    }

    public get trees(): any[] {
        return this._trees;
    }

    public set trees(value: any[]) {
        this._trees = value;

        // register the root nodes for color ids
        for (let j = 0; j < this.trees.length; j++) {
            const entry: AbstractNodeTree = this.trees[j];
            for (let i = 0; i < entry.nodes.length; i++) {
                const n = entry.nodes[i];
            }
        }
        this.updateNodeColors(undefined, false);

        this.clearSelection();
    }

    /**
     * Is called on each tick/frame. 
     * 1. Layouts the trees
     * 2. Updates the color transition values.
     * 3. updates the hovered node
     * 4. updates the opacity values for fading in/out the nodes
     * 5. updates the viewport transformation when all tree should be displayed automatically
     * 6. renders the data.
     */
    public tickEngine(): void {

        // 1.
        Layouter.tickLayout(this._trees, OverviewEngine.delta);
      
        this._trees.forEach(s => s.tickTree());

        // 2.
        if (this.colorTransitionElapsed != undefined) {
            this.colorTransitionElapsed += OverviewEngine.delta;

            if (this.colorTransitionElapsed > this.colorTransitionTarget) {
                this.colorTransitionElapsed = undefined;
                this.colorTransitionMap.clear();
            }
        }

        // 3.
        this.hoverFinder(this);

        // 4.
        let stepPos = 1 + OverviewEngine.delta / 60;
        let stepNeg = 1 - OverviewEngine.delta / 160;
        let listOpacity = Array.from(this.notFound.keys());
        for (let i = 0; i < listOpacity.length; i++) {
            const n = this.notFound.get(listOpacity[i]);
            if (n) {
                n.o *= n.direction ? stepPos : stepNeg;
                n.o = Math.min(1, Math.max(OverviewEngine.opacityMin, n.o));
                if (n.o >= 1) this.notFound.delete(listOpacity[i]);
            }
        }

        // 5.
        if (this.overview && this.overview.showAll && this.workspace.isActive) {
            this.setViewBox(this.getNodesBoundingBox(1.3), 0, TWEEN.Easing.Linear.None);
        }

        // 6.
        if (this.enableRendering && this.workspace.overviewOpen) {
            // render the data on the canvas
            this.renderCanvas(this.context);
        }

    }

    /**
     * Returns the position of the node in the canvas space. As each tree is has a position inside the canvas and the
     * nodes position is relative to that, we have to consider that in determining the actual position in the canvas.
     * @param n The node you want to get the coordinates for.
     * @param offsetX A horizontal offset for the returned coordinates.
     * @param offsetY A vertical offset for the reunted coordinates.
     * @returns The coordinates for the node in the canvas space.
     */
    private getNodeGraphCoordinates(n: AbstractNode, offsetX = 0, offsetY = 0): { x: number, y: number } {
        return n.tree ? { x: n.tree.x + this.getNodePosition(n).x + offsetX, y: n.tree.y + this.getNodePosition(n).y + offsetY } : { x: 0, y: 0 };
    }

    /**
     * Determines if the given node should be rendered or not.
     * @param node The node you want to test. 
     * @returns true: Do NOT render the node, false: The node has to be rendered.
     */
    nodeCulling(node: AbstractNode): boolean {
        if (!this.enableCulling) return false;
        const viewportWidth: number = this.canvasSize.w;
        const viewportHeight: number = this.canvasSize.h;

        const screen = this.graphToScreenCoords(this.getNodeGraphCoordinates(node, MIN_TREE_COLUMN_WIDTH));
        const screenR = this.graphToScreenCoords(this.getNodeGraphCoordinates(node, -MIN_TREE_COLUMN_WIDTH));

        if (screen.x < 0 || screenR.x > viewportWidth || screen.y + 100 < 0 || screen.y - 100 > viewportHeight) {
            return true;
        }
        return false;

    }

    /**
     * Determines if the given link should be rendered or not.
     * @param node The link you want to test. 
     * @returns true: Do NOT render the link, false: The link has to be rendered.
     */
    linkCulling(l: AbstractLink): boolean {
        if (!this.enableCulling) return false;

        const viewportWidth: number = this.canvasSize.w + 100;
        const viewportHeight: number = this.canvasSize.h + 100;

        const screenS = this.graphToScreenCoords(this.getNodeGraphCoordinates(l.source));
        const screenT = this.graphToScreenCoords(this.getNodeGraphCoordinates(l.target));

        if ((screenS.x + 100 < 0 && screenT.x + 100 < 0)
            || (screenS.y < 0 && screenT.y < 0)
            || (screenS.x > viewportWidth && screenT.x > viewportWidth)
            || (screenS.y > viewportHeight && screenT.y > viewportHeight)) {
            return true;
        }
        return false;
    }

    /**
     * Updates the color for the given node or for all nodes by the active FeatureRender Instance.
     * @param node the node for which the color should be updated. if undefined, all nodes will be updated.
     * @param transition true: Does an animated transition for the color, false: The color is changed without animation.
     */
    public updateNodeColors(node: AbstractNode | undefined = undefined, transition: boolean = true): void {

        if (node) {

            if (transition) {
                const colorOld = this.getColorForNode(node);
                let colorNew = this.featureRenderer.getNodeColor(node, node.tree as AbstractNodeTree);

                var scale = d3.scaleLinear<string>()
                    .domain([0, this.colorChangeDuration])
                    .range([colorOld, colorNew]);
                this.colorTransitionMap.set(node, scale);
                this.colorNodeMap.set(node, colorNew);

                this.colorTransitionElapsed = 1;
                this.colorTransitionTarget = this.colorChangeDuration;
            } else {
                let color = this.featureRenderer.getNodeColor(node, node.tree as AbstractNodeTree);
                this.colorNodeMap.set(node, color);
            }

        } else {

            if (transition) {

                for (let i = 0; i < this.trees.length; i++) {
                    const entry: AbstractNodeTree = this.trees[i];
                    let nodes: AbstractNode[] = entry.nodes;
                    for (let j = 0; j < nodes.length; j++) {
                        const node = nodes[j];
                        const colorOld = this.getColorForNode(node);

                        if (colorOld) {
                            let colorNew = this.featureRenderer.getNodeColor(node, entry);
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

                for (let index = 0; index < this.trees.length; index++) {
                    const entry: AbstractNodeTree = this.trees[index];
                    let nodes: AbstractNode[] = entry.nodes;
                    for (let j = 0; j < nodes.length; j++) {
                        const node = nodes[j];
                        let color = this.featureRenderer.getNodeColor(node, entry);
                        color = color == "h" ? OverviewEngine.hiddenColor : color;
                        this.colorNodeMap.set(node, color);
                    }
                }

            }

        }

    }

    /**
     * Set the active render Instance for the node rendering.
     * @param render the new AbstractFeature Instance that will handle the rendering of the nodes.
     */
    public setFeatureRender(render: AbstractFeature) {
        this.featureRenderer = render;
        this.updateNodeColors();
    }

    /**
     * Returns the Position for the given node in the canvas space.
     * @param node The node you want to get the Position for
     * @returns The Position in the canvas space for the given node.
     */
    public getNodePosition(node: AbstractNode): { x: number, y: number } {
        return Layouter.getNodePosition(node);
    }

    /**
     * Tests wether this node should be hidden or not.
     * @param node the node to be tested
     * @param tree the tree the node belongs to 
     * @returns true: the node is hidden, false: the node is not hidden.
     */
    private isNodeHiddenByFeature(node: AbstractNode, tree: AbstractNodeTree) {
        return this.featureRenderer.isNodeHidden(node, tree);
    }

    /**
     * Returns the radius (for drawing node circles) for the given node.
     * @param node The node for which you want to get the radius for.
     * @returns A value in pixels that represents the radius.
     */
    private getNodeRadius(node: AbstractNode): number {
        return this.featureRenderer.getNodeRadius(node, node.tree as AbstractNodeTree);
    }

    /**
     * Is the given node the current hovered node.
     * @param node the node you want to test.
     * @returns true: yes this is the same node is the hovered node, false: it is not.
     */
    private isHoveredNode(node: any) {
        return this.nodeHovered == node;
    }

    /**
     * The values for drawing things in the canvas is scaled by when the user zooms the canvas space.
     * To draw things always in the same size, they need to get adapted by the scaling factor, which this method does
     * @param value The value you want to adapt
     * @param min a minimum pixel size for the value.
     * @param max a maximum pixel size for the value.
     * @returns 
     */
    private getFixedSize(value: number, min: number = value, max: number = Infinity) {
        return Math.max(min, Math.min(value / d3.zoomTransform(this.canvas).k, max));
    }

    /**
     * Returns the color in which the given Node should be drawn in.
     * @param node The node you want to get the color for.
     * @returns A String that represents a color that works with the CanvasRenderingContext2D Interface.
     */
    getColorForNode(node: AbstractNode): string {

        // when the node is faded out completley, return the default color
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

    /**
     * Takes care of the rendering of the tree data. 
     * @param ctx The context that should do the rendering.
     */
    private renderCanvas(ctx: CanvasRenderingContext2D) {

        // clear the canvas from any rendering from the last tick.
        ctx.save();
        ctx.clearRect(0, 0, this.canvasSize.w, this.canvasSize.h);
        ctx.restore();

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = "rgb(30,30,30)";
        ctx.fillRect(0, 0, this.canvasSize.w, this.canvasSize.h);

        this.transform = d3.zoomTransform(this.canvas);
        ctx.translate(this.transform.x, this.transform.y);
        ctx.scale(this.transform.k, this.transform.k);

        if (this.trees) {

            for (let i = 0; i < this.trees.length; i++) {
                const tree: AbstractNodeTree = this.trees[i];

                ctx.save();
                ctx.translate(tree.x, tree.y);

                let nodes: AbstractNode[] = tree.nodes;
                let links: AbstractLink[] = tree.links;
                var renderDataNodes: { color: any, pos: { x: number, y: number }, r: number, culling: boolean }[] = new Array(nodes.length);
                var renderDataLinks: { culling: boolean }[] = new Array(links.length);

                if (doBenchmark) logTime("PrepareRender");
                this.prepareRenderData(nodes, links, renderDataNodes, renderDataLinks);
                if (doBenchmark) logTime("PrepareRender");

                if (doBenchmark) logTime("Render");
                if (doBenchmark) logTime("rlinks");
                this.renderLinks(ctx, nodes, links, tree, renderDataNodes, renderDataLinks);
                if (doBenchmark) logTime("rlinks");
                if (doBenchmark) logTime("rnodes");
                this.drawNodes(ctx, nodes, tree, renderDataNodes);
                if (doBenchmark) logTime("rnodes");
                if (doBenchmark) logTime("rtext");
                this.drawText(ctx, nodes, tree, renderDataNodes);
                if (doBenchmark) logTime("rtext");
                if (doBenchmark) logTime("Render");
                ctx.restore();
            }
        }

        ctx.restore();
    }

    /**
     * 
     * @param nodes All the nodes of one tree.
     * @param links All the links of one tree.
     * @param renderData The Instance where the cached render data for the nodes is added to.
     * @param renderDataLinks The Instance where the cached render data for the links is added to.
     */
    prepareRenderData(nodes: AbstractNode[], links: AbstractLink[], renderData: { color: any; pos: { x: number; y: number; }; r: number; culling: boolean; }[], renderDataLinks: { culling: boolean; }[]) {
        nodes.forEach((n, i) => {
            renderData[i] = { color: this.getColorForNode(n), pos: this.getNodePosition(n), r: this.getNodeRadius(n), culling: this.enableCulling ? this.nodeCulling(n) : false };
        });
        links.forEach((l, i) => {
            renderDataLinks[i] = { culling: this.enableCulling ? this.linkCulling(l) : false };
        });
    }

    /**
     * Does the actual rendering of the links of the tree with bezier curves.
     * @param ctx The context that is used for rendering.
     * @param nodes The nodes of one tree.
     * @param links The links of on tree.
     * @param tree The tree of the nodes.
     * @param renderDataNode The cached data for rendering the nodes
     * @param renderDataLinks The cached data for rendering the links
     */
    renderLinks(ctx: CanvasRenderingContext2D, nodes: AbstractNode[], links: AbstractLink[], tree: AbstractNodeTree, renderDataNode: { color: any, pos: { x: number, y: number }, r: number, culling: boolean }[], renderDataLinks: { culling: boolean }[] = new Array(links.length)) {

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

            var r = renderDataNode[nodes.indexOf(end)].r;
            var rStart = renderDataNode[nodes.indexOf(start)].r;
            if (start.isRoot() && tree.isSyncing) rStart += Math.sin(OverviewEngine.elapsedTotal / 300) * 20;
            let xStart = (start.isRoot() ? renderDataNode[nodes.indexOf(start)].pos.x + rStart : renderDataNode[nodes.indexOf(start)].pos.x + this.textMaxWidth);
            let xEnd = renderDataNode[nodes.indexOf(end)].pos.x - 150;
            let xEndLine = xEnd + 150 - r + 1;

            if (start.isRoot()) {
                ctx.strokeStyle = "#555";
            }

            const drawCurve = () => {
                ctx.beginPath();

                const yStart = renderDataNode[nodes.indexOf(start)].pos.y;
                const yEnd = renderDataNode[nodes.indexOf(end)].pos.y;

                ctx.moveTo(renderDataNode[nodes.indexOf(start)].pos.x + rStart, yStart);
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
            if ((tree && this.selection.includes(tree.root))) {
                ctx.globalAlpha = 1;
                ctx.strokeStyle = OverviewEngine.colorSelection;
                ctx.lineWidth = lineWidth * 3.5;
                // drawCurve();
            }

            let colorStart = renderDataNode[nodes.indexOf(start)].color;

            let colorEnd = renderDataNode[nodes.indexOf(end)].color;
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

    /**
     * Does the actual rendering of the nodes of the tree with arcs.
     * @param ctx The context that is used for rendering.
     * @param nodes The nodes of one tree.
     * @param tree The tree of the nodes.
     * @param renderDataNode The cached data for rendering the nodes
     */
    drawNodes(ctx: CanvasRenderingContext2D, nodes: AbstractNode[], tree: AbstractNodeTree, renderDataNode: { color: any, pos: { x: number, y: number }, r: number, culling: boolean }[]) {

        const ts = this.transform ? this.transform.k : 1;
        ctx.lineWidth = this.getFixedSize(12, 10, 40);
        const angle = 2 * Math.PI;
        var i = 0, len = nodes.length;
        while (i < len) {

            const node = nodes[i];

            var r = renderDataNode[i].r;
            if (renderDataNode[i].culling || r * ts < 1) { i++; continue; }

            const opacity = this.notFound.get(node);
            if (opacity) {
                ctx.globalAlpha = opacity.o;
            } else {
                ctx.globalAlpha = 1;
            }

            ctx.fillStyle = renderDataNode[i].color;
            ctx.strokeStyle = ctx.fillStyle;

            if (node.isRoot() && tree.isSyncing) {
                const t = 0.5 * (1 + Math.sin(OverviewEngine.elapsedTotal / 300));
                r *= t + 0.01;

                var scale = d3.scaleLinear<string>()
                    .domain([0, this.colorChangeDuration])
                    .range([OverviewEngine.colorSelection, "rgb(255,255,255)"]);
                ctx.fillStyle = scale(Math.sin(t));
            }

            let xPos = renderDataNode[i].pos.x;

            ctx.beginPath();

            if (node.isCollection()) {
                ctx.arc(
                    xPos, renderDataNode[i].pos.y,
                    Math.max(0.1, r - ctx.lineWidth / 2),
                    0, angle
                );
                ctx.stroke();
            } else {
                ctx.arc(
                    xPos, renderDataNode[i].pos.y,
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
                    xPos, renderDataNode[i].pos.y, Math.max(1, r - ctx.lineWidth / 2),
                    0, angle
                );
                ctx.strokeStyle = OverviewEngine.colorSelection;
                ctx.stroke();
            }

            i++;
        }

    }

    /**
     * Does the actual rendering of the Text next to the nodes.
     * @param ctx The context that is used for rendering.
     * @param nodes The nodes of one tree.
     * @param tree The tree of the nodes.
     * @param renderDataNode The cached data for rendering the nodes
     */
    drawText(ctx: CanvasRenderingContext2D, nodes: AbstractNode[], tree: AbstractNodeTree, renderDataNode: { color: any, pos: { x: number, y: number }, r: number, culling: boolean }[]) {

        ctx.fillStyle = "#fff";

        let scale = this.transform ? this.transform.k : 1;

        let op: number = scale >= 0.05 && scale <= 0.1 ? (scale - 0.05) * 20 : scale < 0.1 ? 0 : 1;

        // the greater the zoom, the smaller the fontsize
        const fontSize = this.getFixedSize(45, 45, 80);
        const fontSize2 = this.getFixedSize(30, 30, 50);

        const limitText = (n: AbstractNode) => (n.children.length > 0 && (n.name + "...").length > 24) ? n.name.substring(0, 18) + "..." : n.name;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];

            if (renderDataNode[i].culling) continue;

            let isNodeHovered = this.isHoveredNode(node);

            let xPos = renderDataNode[i].pos.x;

            if (!node.isRoot()) {

                if (scale < 0.025) continue;
                // child node
                const opacity = this.notFound.get(node);
                if (!opacity || this.isHoveredNode(node) || this.selection.includes(tree.root)) {
                    ctx.globalAlpha = op;
                } else {
                    ctx.globalAlpha = opacity.o;
                }

                if (op > 0) {
                    xPos += node.isCollection() ? this.textPadding + 45 : this.textPadding;
                    ctx.textAlign = "left";

                    ctx.fillStyle = this.isNodeHiddenByFeature(node, tree) ? OverviewEngine.hiddenColor : "#fff";
                    let translate = (fontSize) / 3;
                    ctx.font = `${fontSize}px Arial`;
                    let yName = node.children.length == 0 ? renderDataNode[i].pos.y + (fontSize) / 4 : renderDataNode[i].pos.y - translate;

                    if (this.selection.includes(node)) ctx.fillStyle = OverviewEngine.colorSelection;

                    ctx.fillText(`${node.isCollection() ? limitText(node) + " (+ " + (node.collectionData?.size) + ")" : limitText(node)}  `, xPos, yName);

                    ctx.fillStyle = this.isNodeHiddenByFeature(node, tree) ? OverviewEngine.hiddenColor : "#ddd";
                    translate = (fontSize2) / (node.children.length == 0 ? 8 : 3);
                    ctx.font = `${fontSize2}px Arial italic`;
                    const text = this.featureRenderer.getFeatureText(node, tree);
                    if (text) ctx.fillText(text, xPos, yName + translate + (fontSize2 + 4) * 1);
                }

            } else {
                // root node
                ctx.globalAlpha = 1;
                ctx.textAlign = "right";

                let fontSize = this.getFixedSize(20);
                let translate = (fontSize) / 4;
                ctx.font = `${fontSize}px Arial`;

                let name = (isNodeHovered || this.selection.includes(node)) && tree ? tree.getName() : node.name;
                let yName = renderDataNode[i].pos.y + translate;

                var r = renderDataNode[i].r;
                xPos -= r * 1.1;

                ctx.fillStyle = "#fff";
                if (this.selection.includes(node)) {
                    ctx.fillStyle = OverviewEngine.colorSelection;
                }

                ctx.fillText(name, xPos, yName);

                ctx.fillStyle = this.isNodeHiddenByFeature(node, tree) ? OverviewEngine.hiddenColor : "#bbb";
                const text = this.featureRenderer.getFeatureText(node, tree);
                if (text) ctx.fillText(text, xPos, yName + (fontSize + 4) * 1);

            }


        }
        ctx.globalAlpha = 1;
    }

}