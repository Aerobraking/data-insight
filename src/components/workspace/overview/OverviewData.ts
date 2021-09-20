import { Type, Exclude } from "class-transformer";
import * as d3 from "d3";
import * as d3f from "d3-force-reuse";
import { SimulationNodeDatum, SimulationLinkDatum, ForceCenter, Simulation, ForceLink, ForceY, Quadtree } from "d3";
import { FolderNode, FolderOverviewEntry } from "./FileEngine";
import path from "path";
import { OverviewEngine } from "./OverviewEngine";
import TWEEN from "@tweenjs/tween.js";
import { Tween } from "@tweenjs/tween.js";
import { Stats, StatsType } from "./OverviewInterfaces";



export abstract class AbstractNode implements SimulationNodeDatum {

    constructor(nodetype: string, name: string) {
        this.nodetype = nodetype;
        this._name = name;
    }

    public getChildren() {
        return this.children;
    }

    public addChild(c: this) {
        c.parent = this;
        c.entry = this.entry;
        c.depth = c.parents().length;
        let bottom = c.parent.children.length > 0 ? c.parent.children.reduce((prev, current, index, a) => { return prev.getY() < current.getY() ? prev : current }) : undefined;
        c.y = bottom ? bottom.getY() + 50 : this.y;
        this.children.push(c);
        this.entry?.engine?.nodeAdded(c);
    }

    public removeChild(c: this) {
        let index = this.children.indexOf(c);
        if (index > -1) {
            this.children.splice(index, 1);
            this.entry?.engine?.nodeUpdate();
        }
    }


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

    public get name(): string {
        return this._name;
    }
    public set name(value: string) {
        this._name = value;
        if (this.entry) {
            this.entry.nodeUpdate();
        }
    }

    public getStatsValue(key: string): number | undefined {
        if (this.statsRec) {
            let e = this.statsRec.stats[key];
            if (e) {
                return e.value;
            }
        }
        return undefined;
    }

    public isRoot(): boolean {
        return this.parent == undefined;
    }

    public get x(): number | undefined {
        // let x = this.parent ? this.entry ? this.entry?.getColumnX(this) : 200 * this.depth : this._x;
        let x = this.parent ? 500000 * this.depth : this._x;
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
        return this._x ? this._x : 0;
    }

    public getRadius() {
        if (this.isRoot()) {
            return 100;
        } else if (this.entry) {
            let abs = this.entry.root.getStatsValue("size");
            let part = this.getStatsValue("size");
            if (abs && part && abs > 0) {
                return Math.sqrt(31415 * (part / abs) / Math.PI);
            }
        }
        return 100;
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

    private collectNodes(node: this, a: Array<this>): void {
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

        this.root.fx = 0;
        this.root.fy = 0;

        this.simulation = d3
            .forceSimulation([] as Array<D>)
            .force('link', d3.forceLink().strength(0.2))
            // @ts-ignore: Unreachable code error
            //  .force("charge", d3f.forceManyBodyReuse().distanceMax(100).strength(0.5))
            // .force('charge', d3.forceManyBody().distanceMax(100).strength(0.5))
            // .force("collide", d3.forceCollide<AbstractNode>().radius(d => Math.max(d.getRadius() * 4, 225))
            //     .iterations(4).strength(0.5))
            .force("collide", d3.forceCollide<AbstractNode>().radius(120)
                .iterations(8).strength(1.0))
            .force(
                "y",
                d3.forceY()
                    .y(function (d: any) {
                        return 0;
                    })
                    .strength(0.0)
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

    public nodeUpdate() {
        if (this.engine) {
            this.engine.nodeUpdate();
        }
    }

    public addStats(stats: Stats) {
        let node = this.getNodeByPath(stats.path);
        if (node) {
            node.stats = stats;

            let parent: D | undefined = node;

            while (parent) {

                // reset the recursive stats so we can recalculate them
                parent.statsRec = { path: "", stats: {} }
                if (parent.stats) {
                    Object.assign(parent.statsRec, parent.stats);
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
                                    if (!statsParent.stats[key]) {
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

    public addEntryPath(relativePath: string) {
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

        // let f: ForceCenter<AbstractNode> | undefined = this.simulation.force("center");
        // if (f) {
        //     f.x(this.x);
        //     f.y(this.y);
        // }
    }

    // public get x(): number {
    //     return this.root.x ? this.root.x : 0;
    // }

    // public set x(value: number) {
    //     this.root.x = value;
    //     this.root.fx = value;
    // }

    // public get y(): number {
    //     return this.root.y ? this.root.y : 0;
    // }

    // public set y(value: number) {
    //     this.root.y = value;
    //     this.root.fy = value;

    //     for (let i = 0; i < this.root.descendants().length; i++) {
    //         const c = this.root.descendants()[i];
    //         c.fy = value;
    //     }
    // }

    /**
     * Updates the list of all nodes and links for this entry.
     * Assign all nodes to the force simulation in case of new created nodes.
     * @param reheat sets the alpha to one
     */
    protected updateSimulationData(reheat: boolean = true) {

        if (reheat) {
            this.simulation.alpha(1);
        }

        let f: ForceLink<D, AbstractLink<D>> | undefined = this.simulation.force<ForceLink<D, AbstractLink<D>>>("force");
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
                return d.parent ? 0.002 : 0;
            })
        }

        this.simulation.tick();


        this.quadtree = d3.quadtree<D>()
            .x(function (d) { return d.getX(); })
            .y(function (d) { return d.getY(); });

        this.quadtree.addAll(this.nodes);

    }
}
