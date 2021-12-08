import { Type, Exclude } from "class-transformer";
import * as d3 from "d3";
import * as d3f from "d3-force-reuse";
import { SimulationNodeDatum, SimulationLinkDatum, ForceCenter, Simulation, ForceLink, ForceY, Quadtree, ForceCollide } from "d3";
import { FolderNode, FolderOverviewEntry } from "./FileEngine";
import path from "path";
import { COLUMNWIDTH, OverviewEngine } from "./OverviewEngine";
import TWEEN from "@tweenjs/tween.js";
import { Tween } from "@tweenjs/tween.js";
import { Stats, StatsType } from "./OverviewInterfaces";
import { IframeOutline } from "mdue";
import rectCollide from "@/utils/ForceCollideRect";
import CollideExtend from "@/utils/CollideExtend";

/**
 * collision nur pro spalte
 * dann die radien anhand der kinder berechnen
 * bei überschniedungen in richtung des eltern nodes verschieben
 */


/**
 * Beinhaltet eine Liste von children eines Parent Nodes.
 */
export class RectangleCollide<D extends AbstractNode> implements SimulationNodeDatum {

    width: number = 100;
    height: number = 100;
    radius: number = 35;
    node: D;

    constructor(node: D) {
        this.node = node;
        this.updateRadius();
    }

    public get depth(): number {
        return this.node.getDepth() + 1;
    }

    public updateRadius() {
        if (this.node.getChildren().length > 1) {
            this.radius = this.node.getChildren().map(d => d.getRadius()).reduce(function (prev, current) {
                return prev + current;
            })
        } else if (this.node.getChildren().length == 1) {
            this.radius = this.node.getChildren()[0].getRadius();
        }

        this.radius *= 2;

        this.y = this.node.getChildren().reduce((total, next) => total + next.getY(), 0) / this.node.getChildren().length;
    }
    /**
     * Node’s zero-based index into nodes array. 
     * This property is set during the initialization process of a simulation.
     */
    index?: number | undefined;
    /**
     * Node’s current y-position
     */
    private _x?: number | undefined;
    public get x(): number | undefined {
        return 0;
    }
    public set x(value: number | undefined) {
        this._x = value;
    }
    private _y?: number | undefined;
    public get y(): number | undefined {
        this.y = this.node.getChildren().reduce((total, next) => total + next.getY(), 0) / this.node.getChildren().length;
        return this._y;
    }
    public set y(value: number | undefined) {
        this._y = value;
    }
    /**
     * Node’s current x-velocity
     */
    vx?: number | undefined;
    /**
     * Node’s current y-velocity
     */
    private _vy?: number | undefined;

    public get vy(): number | undefined {
        return this._vy;
    }

    public set vy(value: number | undefined) {
        this._vy = value;
        const diff = this._vy && this._vyOld ? this._vy - this._vyOld : 0;
        if (OverviewEngine.framecounter % 400 == 0) {
            // console.log("diff: " + diff);
        }
        /**
         * Add velocity to nodes
         */
        for (let i = 0; i < this.node.getChildren().length; i++) {
            const child = this.node.getChildren()[i];
            if (child.vy) {
                // child.vy += diff*0.05;
            }
        }
        this._vyOld = this._vy;
    }

    _vyOld?: number | undefined;
    /**
     * Node’s fixed x-position (if position was fixed)
     */
    private _fx?: number | null | undefined;
    public get fx(): number | null | undefined {
        return 0;
    }
    public set fx(value: number | null | undefined) {
        this._fx = value;
    }
    /**
     * Node’s fixed y-position (if position was fixed)
     */
    fy?: number | null | undefined;
}



export abstract class AbstractNode implements SimulationNodeDatum {

    constructor(nodetype: string, name: string) {
        this.nodetype = nodetype;
        this._name = name;

        this.simulation = d3
            .forceSimulation([] as Array<this>)
            .force("collide", d3.forceCollide<AbstractNode>().radius(d => {
                var r = d.forceRadius;
                return r;
            }).iterations(8).strength(0.25))
            .force("charge", d3.forceManyBody<AbstractNode>().strength(-1400))
            .alphaDecay(1 - Math.pow(0.001, 1 / 4000000))
            .alphaMin(0.003)
            .alphaTarget(0.3)
            .stop();

        this.updateForce();
    }

    public getChildren() {
        return this.children;
    }

    public addChild(c: this) {
        c.parent = this;
        c.entry = this.entry;
        c.depth = c.parents().length;

        const nodes: this[] = [];
        this.entry ? this.entry.root.collectNodes(this.entry.root, nodes) : [];

        const listNodes = nodes.filter(n => n.getDepth() == this.getDepth() + 1);

        listNodes.sort((a, b) => a.getY() - b.getY());

        let bottom = listNodes.length ? listNodes[listNodes.length - 1] : undefined;
        let BottomFromList = bottom ? bottom.getY() + 150 : this.getY();
        let yfromParent = this.getY();


        c.y = Math.max(yfromParent, BottomFromList);
        this.children.push(c);
        this.entry?.nodeAdded(c);
        this.updateSimulation();
        this.updateForce();
    }

    public removeChild(c: this) {
        let index = this.children.indexOf(c);
        if (index > -1) {
            this.children.splice(index, 1);
            this.entry?.nodeRemoved(c);
            this.updateSimulation();
            this.updateForce();
        }
    }

    flag: number = 0;
    forceRadius: number = 16;

    public updateForce() {

        /**
         * 1. Wir brauchen Kräfte, die die Children zum zentrum ihres parents ziehen.
         * 2. Kräfte, die die Children Liste als einen zusammenhängenden Block darstellen, die pro spalte
         * miteinander berechnet werden. Die Spalten müssen nach obne hin aktualisiert werden jedes mal
         * wenn die Liste der Children einer Note aktualisiert werden.
         * 
         * Alpha is given to some forces, not all (manybody yes, collide no) the velocty of all are summed up and then
         * applied to the x/y coordinates by a factor of 0.6, the decay of the simulation. can be changed via the 
         * velocityDecay in the simulation. Higher means more friction, so slower movement 
         */
        if (this.children.length > 1) {
            this.forceRadius = this.children.map(d => 100 * 1.0).reduce(function (p, c) { return p + c }) / this.children.length * this.children.length
            this.forceRadius += 120;
        } else if (this.children.length == 1) {
            this.forceRadius = this.children[0].getRadius();
            this.forceRadius = 100;
        } else {
            this.forceRadius = 140;
        }

        // make sure the radius is not smaller then the node itself

        if (this.parent) {
            this.parent.updateForce();
        }

    }

    public getRadius() {
        if (this.isRoot()) {
            return 100;
        } else if (this.entry) {
            let abs = this.entry.root.getStatsValue("size");
            let part = this.getStatsValue("size");
            if (abs != undefined && part != undefined) {
                let r = abs > 0 ? Math.sqrt(31415 * (part / abs) / Math.PI) : 1;
                r = 100 * 0.2 + r * 0.8;
                return Math.max(r, 16);
            }
        }
        return 16;
    }

    public updateSimulation() {
        this.simulation.nodes(this.children);
    }

    // the d3 simulation instance
    @Exclude()
    simulation: Simulation<this, AbstractLink<this>>;
    // list of child node for this node
    @Type(() => FolderNode)
    private children: Array<this> = [];
    // the colorid for the overview engine, will be generated on the fly while rendering
    @Exclude()
    colorID: string | null = null;
    // the parent node. will be set after loading from the json
    @Exclude()
    parent: this | undefined;
    // the OverviewEntry this nodes belongs to. will be set after loading from the json
    @Exclude()
    entry: FolderOverviewEntry | undefined;
    // the depth inside the tree structure, relative to the root node
    depth: number = 0;
    // string for json that links to the javascript implemented class
    nodetype: string;
    //
    id?: string | number;
    // stats for this node
    stats: Stats | undefined;
    // stats that combines the stats for all descendent nodes and this node
    statsRec: Stats | undefined;
    // the name of this string, should be unique inside the parents node childrens list
    private _name: string;
    /**
     * Node’s zero-based index into nodes array.
     * This property is set during the initialization process of a simulation.
     */
    index?: number | undefined;
    /**
     * Node’s current x-position
     */
    private _x?: number | undefined;
    isCollection: boolean = false;



    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
        if (this.entry) {
            this.entry.nodeUpdate();
        }
    }

    public tick() {

        let c = this.simulation.force<ForceCollide<this>>("collide");

        if (c) {
            let collide: ForceCollide<this> = c;
            collide.radius((d: this, i: number, nodes: this[]) => {
                // return d.getRadius() * 1.5;
                return d.forceRadius;
            }
            );
        }

        this.simulation.alpha(1);
        this.simulation.tick();
    }

    public getStatsValue(key: string, recursive: boolean = true): number | undefined {
        if (recursive) {
            if (this.statsRec) {
                let e = this.statsRec.stats[key];
                if (e) {
                    return e.value;
                }
            }
        } else {
            if (this.stats) {
                let e = this.stats.stats[key];
                if (e) {
                    return e.value;
                }
            }
        }

        return undefined;
    }

    public isRoot(): boolean {
        return this.parent == undefined;
    }

    public get x(): number | undefined {
        // let x = this.parent ? this.entry ? this.entry?.getColumnX(this) : 200 * this.depth : this._x;
        let x = this.parent ? COLUMNWIDTH * this.depth : this._x;
        x = this._x ? this._x : x;
        return x;
    }

    public set x(value: number | undefined) {
        this._x = value;
    }

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

    public getX() {
        return COLUMNWIDTH * this.depth;
        // return this._x ? this._x : 0;
    }

    public getY() {
        return this.y ? this.y : 0;
    }

    public getDepth(): number {
        this.depth = 0;
        let p: this = this;
        while (p.parent) {
            this.depth++;
            p = p.parent;
        }
        return this.depth;
    }

    private collectNodes(node: this = this, a: Array<this> = []): void {
        a.push(node);

        for (let i = 0; i < node.children.length; i++) {
            let c: this = node.children[i];
            this.collectNodes(c, a);
        }
    }

    descendants(withItself: boolean = true): Array<this> {
        let a: Array<this> = [];
        if (withItself) {
            a.push(this);
        }

        for (let i = 0; i < this.children.length; i++) {
            this.collectNodes(this.children[i], a);
        }
        return a;
    }

    parents(addItself: boolean = false): Array<this> {
        let a: Array<this> = [];
        let p = this;
        if (addItself) {
            a.push(p);
        }
        while (p.parent) {
            a.push(p.parent);
            p = p.parent;
        }
        return a;
    }

    /**
   * Returns an array of links for this node, where each link is an object that defines source and target properties.
   * The source of each link is the parent node, and the target is a child node.
   * @returns
   */
    links(): Array<AbstractLink<this>> {
        let a: Array<AbstractLink<this>> = [];
        this.collectLinks(this, a);
        return a;
    }

    private collectLinks(node: this, a: Array<AbstractLink<this>>): void {
        for (let i = 0; i < node.children.length; i++) {
            let c: this = node.children[i];
            a.push({ source: node, target: c });
            this.collectLinks(c, a);
        }
    }
}

/**
 * Defines the Link between two AbstractNode instances. Extend it to use it with your AbstractNode subclass.
 */
export class AbstractLink<D extends AbstractNode = AbstractNode> implements SimulationLinkDatum<D>{
    constructor(source: D, target: D) {
        this.source = source;
        this.target = target;
    }
    source: D;
    target: D;
}

export interface EntryListener<D extends AbstractNode = AbstractNode> {
    nodeAdded(node: D): void;
    nodeUpdate(): void;
}

export interface ColumnTextWidth {
    depth: number,
    min: number,
    max: number
}


export abstract class AbstractOverviewEntry<D extends AbstractNode = AbstractNode> {

    constructor(nodetype: string, path: string, root: D) {
        this.nodetype = nodetype;
        this.path = path;
        this.root = root;
        this.id = Math.floor(Math.random() * 10000000);
        // @ts-ignore: Unreachable code error
        this.root.entry = this;

        this.nodes = this.root.descendants();

        this.root.fx = 0;
        this.root.fy = 0;

        this.simulation = d3
            .forceSimulation([] as Array<D>)
            .force('link', d3.forceLink<AbstractNode, AbstractLink>()
                .strength(function (d: AbstractLink, i: number, data: AbstractLink[]) {
                    // return d.source.isRoot() ? 0.0002 : 0.01;
                    return 100;
                }).distance(1).iterations(2)
            )
            // .force("collide", d3.forceCollide<D>().radius(d => {
            //     var r = d.getRadius() * 1.1;
            //     return r;
            // }).iterations(2).strength(0.3))
            .force(
                "y",
                d3.forceY()
                    .y(function (d: any) {
                        return 0;
                    })
                    .strength(0.0)
            )
            .force(
                "collideExt",
                CollideExtend()
                    .radius(function (d: any) {
                        return d.forceRadius;
                    })
                    .strength(0)
            )
            .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
            .alphaMin(0.003)
            .alphaTarget(0.004)
            .stop();

    }

    x: number = 0;
    y: number = 0;

    // the root node
    @Type(() => FolderNode)
    root: D;

    // unique id for this entry
    id: number;

    // The absolute path to the root folder
    path: string;

    @Exclude()
    engine: EntryListener<AbstractNode> | undefined;

    // disables the d3 force simulation when false
    isSimulationActive: boolean = true;

    // identifier for json serializing
    nodetype: string;

    // the d3 simulation instance
    @Exclude()
    simulation: Simulation<D, AbstractLink<D>>;
    // list of all nodes inside this entry. will be set everytime the amount of nodes changes
    @Exclude()
    nodes: D[] = [];
    // list of all links between the nodes in this entry. will be set everytime the amount of nodes changes
    @Exclude()
    links: AbstractLink[] = [];
    @Exclude()
    quadtree: Quadtree<D> | undefined;

    public abstract initAfterLoading(): void;

    public abstract createNode(name: string): D;

    public renameByPaths(oldPath: string, newPath: string) {

        let node = this.getNodeByPath(oldPath);

        newPath = path.normalize(path.relative(this.path, newPath)).replace(/\\/g, "/");

        let newName = path.basename(newPath);

        if (node) {
            // the name renaming fires an nodeupdate event in the setter function
            node.name = newName;
        }

    }

    public addStats(stats: Stats) {
        let node = this.getNodeByPath(stats.path);
        if (node) {
            node.stats = stats;
            node.updateForce();

            let parent: D | undefined = node;

            while (parent) {

                // reset the recursive stats so we can recalculate them
                parent.statsRec = { path: "", stats: {} }
                if (parent.stats) {
                    parent.statsRec = JSON.parse(JSON.stringify(parent.stats));
                }

                let statsParent = parent.statsRec;

                /**
                 * We recalculate the stats for the node and then for all coming parent nodes.
                 * For that we combine the stat of the node folder with the stats of all its child nodes
                 */
                for (let i = 0; i < parent.getChildren().length; i++) {
                    const c = parent.getChildren()[i];
                    let childStats = c.statsRec;
                    if (childStats) {
                        Object.keys(childStats.stats).forEach((key: string) => {
                            if (statsParent && childStats) {
                                if (childStats.stats[key]) {

                                    // init the value in the stats if not available yet 
                                    if (statsParent.stats[key] == undefined) {
                                        statsParent.stats[key] = { value: 0, type: childStats.stats[key].type }
                                    }
                                    /**
                                     * We add the values together when we have a sum value.
                                     */
                                    if (childStats.stats[key].type == StatsType.SUM) {
                                        statsParent.stats[key].value += childStats.stats[key].value;
                                    }
                                }

                            }
                        })
                    }
                }

                parent.updateForce();
                parent = parent.parent;
            }

        }
        this.nodeUpdate();
    }

    public getNodeByPath(absPath: string): D | undefined {
        absPath = path.normalize(path.relative(this.path, absPath)).replace(/\\/g, "/");

        let folders: string[] = absPath.split("/");

        let currentFolder: D | undefined = this.root;
        s:
        for (let i = 0; i < folders.length; i++) {
            const f = folders[i];

            let childFound: D | undefined = currentFolder.getChildren().find(c => c.name == f);
            if (childFound) {
                currentFolder = childFound;
            } else {
                currentFolder = undefined;
                break s;
            }
        }
        return currentFolder;

    }

    public addEntryPath(relativePath: string, isCollection: boolean = false) {
        relativePath = path.normalize(path.relative(this.path, relativePath)).replace(/\\/g, "/");

        let folders: string[] = relativePath.split("/");

        let foldersCreated = false;

        let currentFolder = this.root;
        for (let i = 0; i < folders.length; i++) {
            const f = folders[i];

            let childFound = currentFolder.getChildren().find(c => c.name == f);
            if (childFound) {
                // Child was found, go to next subfolder
            } else {
                // Create new sub folder
                foldersCreated = true;
                childFound = this.createNode(f);
                currentFolder.addChild(childFound);

                if (i == folders.length - 1) {
                    // the sumbmitted folder
                    childFound.isCollection = isCollection;
                }
            }
            currentFolder = childFound;
        }

        if (foldersCreated) {
            this.simulation.alpha(1);
            this.updateSimulationData(false);
        }

    }

    public removeEntryPath(relativePath: string) {

        relativePath = path.normalize(path.relative(this.path, relativePath)).replace(/\\/g, "/");
        let folders: string[] = relativePath.split("/");
        let currentFolder: D | undefined = this.root;

        s:
        for (let i = 0; i < folders.length; i++) {
            const f = folders[i];
            if (currentFolder) {
                currentFolder = currentFolder.getChildren().find(c => c.name == f);
            }
        }

        // remove folder if found
        if (currentFolder && currentFolder.parent) {
            currentFolder.parent.removeChild(currentFolder);
            this.simulation.alpha(1);
            this.updateSimulationData(false);
        }
    }

    public setCoordinates(c: { x: number, y: number }) {
        this.x = c.x;
        this.y = c.y;
    }


    /**
     * One value contains a simulation with a list of RectangleCollide instances. each representing a nodes children list a
     * one large circle.
     * The depth starts at 2. 0 is the single root node. column one only contains nodes that belong to one childrens list,
     * so they are already colliding with each other.
     */
    columnForceMap: Map<number, Simulation<RectangleCollide<D>, undefined>> = new Map();

    public nodeUpdate() {
        this.engine?.nodeUpdate();
    }

    public nodeRemoved(c: D) {
        this.updateSimulationData();
        this.updateColumnForces();
        this.engine?.nodeUpdate();
    }

    public nodeAdded(c: D) {

        this.updateSimulationData();
        this.updateColumnForces();
        this.engine?.nodeAdded(c);

        const depth = c.getDepth();
        // if (depth > 1) {

        //     let f = this.columnForceMap.get(depth);
        //     if (!f) {
        //         f = d3
        //             .forceSimulation<RectangleCollide<D>>([] as Array<RectangleCollide<D>>)
        //             .force("collide", d3.forceCollide<RectangleCollide<D>>().radius(d => {
        //                 var r = d.radius * 1.1;
        //                 return r;
        //             }).iterations(2).strength(0.4))
        //             .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
        //             .alphaMin(0.003)
        //             .alphaTarget(0.004)
        //             .stop();
        //         this.columnForceMap.set(depth, f);
        //     }


        // }
    }



    /**
     * Updates the list of all nodes and links for this entry.
     * Assign all nodes to the force simulation in case of new created nodes.
     * @param reheat sets the alpha to one
     */
    protected updateColumnForces() {

        this.nodes = this.root.descendants();

        for (let i = 1, depth = i + 1; i < 0; i++, depth++) {
            const listNodes = this.nodes.filter(n => n.depth == i);
            if (listNodes) {
                let f = this.columnForceMap.get(depth);
                if (!f) {
                    f = d3
                        .forceSimulation<RectangleCollide<D>>([] as Array<RectangleCollide<D>>)
                        .force("collide", d3.forceCollide<RectangleCollide<D>>().radius(d => {
                            var r = d.radius * 1.1;
                            return r;
                        }).iterations(2).strength(1.0))
                        .force("charge", d3.forceManyBody<RectangleCollide<D>>().strength(d => {
                            var r = Math.max(1, Math.pow(d.radius, 1));
                            return 0;
                        }))
                        .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
                        .alphaMin(0.003)
                        .alphaTarget(0.004)
                        .stop();
                    this.columnForceMap.set(depth, f);
                }

                f.alpha(1);

                const listRects = [];

                for (let j = 0; j < listNodes.length; j++) {
                    const n = listNodes[j];
                    if (n.getChildren().length) {
                        let r = new RectangleCollide(n);
                        listRects.push(r);
                    }

                }

                f.nodes(listRects);

            } else {
                // when no nodes are found, the maximum depth is reached.
                break;
            }

        }

    }


    /**
     * Updates the list of all nodes and links for this entry.
     * Assign all nodes to the force simulation in case of new created nodes.
     * @param reheat sets the alpha to one
     */
    protected updateSimulationData(reheat: boolean = true) {

        if (reheat) {
            this.simulation.alpha(1);
        }

        let f: ForceLink<D, AbstractLink<D>> | undefined = this.simulation.force<ForceLink<D, AbstractLink<D>>>('link');
        this.nodes = this.root.descendants();
        this.links = this.root.links();

        if (f) {
            f.links(this.links as any);
        }
        this.simulation.nodes(this.nodes);

    }

    tick() {

        let y: ForceY<D> | undefined = this.simulation.force(
            "y"
        );

        if (y) {
            y.y(function (d: D) {
                return d.parent ? d.parent.getY() : d.getY();
            }).strength(function (d: D, i: number, data: D[]) {
                // return d.parent ? d.parent.isRoot() ? 0.0005 : 0.001 : 0;
                return 1;
            })
        }

        let vyMax = 0;

        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].tick();
            if (OverviewEngine.framecounter % 400 == 0) {
                if (this.nodes[i].getChildren().length == 0) {
                    this.nodes[i].updateForce();
                }
            }
            let vy: number = this.nodes[i].vy ? this.nodes[i].vy as number : 0;
            vy = Math.abs(vy);
            vyMax = vy > vyMax ? vy : vyMax;
        }

        // if (OverviewEngine.framecounter % 60 == 0) {
        //     console.log("vyMax: ");
        //     console.log(vyMax);
        // }


        this.simulation.alpha(1);
        this.simulation.tick();

        // const columnForces = Array.from(this.columnForceMap.values());

        // for (let i = 0; i < columnForces.length; i++) {
        //     const f = columnForces[i];
        //     f.tick();
        // }

        this.quadtree = d3.quadtree<D>()
            .x(function (d) { return d.getX(); })
            .y(function (d) { return d.getY(); });

        this.quadtree.addAll(this.nodes);
 
        // console.log("update qTree", this.nodes.length);


    }
}

export class ColumnNodeContainer<D extends AbstractNode>{

    private listNodes: D[] = [];
    simulation: Simulation<D, undefined>;
    constructor() {
        this.simulation = d3
            .forceSimulation<D>([] as Array<D>)
            .force("collide", d3.forceCollide<D>().radius(d => {
                var r = d.forceRadius * 1.1;
                return r;
            }).iterations(2).strength(0.4))
            .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
            .alphaMin(0.003)
            .alphaTarget(0.004)
            .stop();
    }

    addNode(node: D) {
        this.listNodes.push(node);
        this.simulation.nodes(this.listNodes);
    }
}