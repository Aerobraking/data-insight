import { Type, Exclude } from "class-transformer";
import * as d3 from "d3";
import * as d3f from "d3-force-reuse";
import { SimulationNodeDatum, SimulationLinkDatum, ForceCenter, Simulation, ForceLink, ForceY, Quadtree, ForceCollide } from "d3";
import { FolderNode, FolderOverviewEntry } from "./FileEngine";
import path from "path";
import { OverviewEngine } from "./OverviewEngine";
import TWEEN from "@tweenjs/tween.js";
import { Tween } from "@tweenjs/tween.js";
import { Stats, StatsType } from "./OverviewInterfaces";
import { IframeOutline } from "mdue";
import rectCollide from "@/utils/ForceCollideRect";

export class RectangleCollide implements SimulationNodeDatum {

    width: number = 100;
    height: number = 100;
    /**
     * Node’s zero-based index into nodes array. This property is set during the initialization process of a simulation.
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
    y?: number | undefined;
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
        /**
         * Add velocity too nodes
         */
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

                var r = d.getRadius();
                r = 80 * 0.2 + r * 0.8;

                return r;
            })
                .iterations(2).strength(0.4))
            .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
            .alphaMin(0.003)
            .alphaTarget(0.01)
            .stop();
    }

    public getChildren() {
        return this.children;
    }

    public addChild(c: this) {
        c.parent = this;
        c.entry = this.entry;
        c.depth = c.parents().length;

        let bottom = c.parent.children.length > 0 ? c.parent.children.reduce((prev, current, index, a) => { return prev.getY() < current.getY() ? prev : current }) : undefined;

        c.y = bottom ? bottom.getY() + 20 : this.y;
        this.children.push(c);
        this.entry?.engine?.nodeAdded(c);
        this.updateSimulation();

        this.updateForce();
    }

    public removeChild(c: this) {
        let index = this.children.indexOf(c);
        if (index > -1) {
            this.children.splice(index, 1);
            this.entry?.engine?.nodeUpdate();
            this.updateSimulation();
        }
    }

    forceRadius: number = 16;

    public updateForce() {

        /**
         * Wir müssen wahrscheinlich rekursiv vorgehen.
         * also hier radius berechnen und den 
         */
        if (this.children.length > 1) {
            const max = this.children.reduce(function (prev, current) {
                return (prev.getY() > current.getY()) ? prev : current
            })
            const min = this.children.reduce(function (prev, current) {
                return (prev.getY() < current.getY()) ? prev : current
            })
            if (max && min) {
                this.forceRadius = (max.getY() + max.forceRadius) - (min.getY() - min.forceRadius);
                // console.log("forceRadius: "+ this.forceRadius);
            }
            const sum = this.children.map(d => d.forceRadius).reduce(function (prev, current) {
                return prev + current;
            })
            this.forceRadius = sum * 1.2;
            // console.log("sum: "+ sum);
            // console.log(" ");


        } else if (this.children.length == 1) {

            var r = this.children[0].forceRadius;
            r *= 1.2;
            this.forceRadius = r;

        } else {
            this.forceRadius = this.getRadius();
        }

        // make sure the radius is not smaller then the node itself
        this.forceRadius = Math.max(this.getRadius() * 1.2, this.forceRadius);


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
                r = 80 * 0.2 + r * 0.8;

                return r;
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

        function getR(d: AbstractNode): number {
            var r = d.getRadius();
            r = 80 * 0.2 + r * 0.8;
            r *= 1.2;
            return r;
        }

        if (c) {
            let collide: ForceCollide<this> = c;
            collide.radius((d: this, i: number, nodes: this[]) => {
                // var r = getR(d);
                // r = 80 * 0.2 + r * 0.8;
                // r *= 1.2;
                // if (d.children.length > 1) {
                //     const max = d.children.reduce(function (prev, current) {
                //         return (prev.getY() > current.getY()) ? prev : current
                //     })
                //     const min = d.children.reduce(function (prev, current) {
                //         return (prev.getY() < current.getY()) ? prev : current
                //     })
                //     if (max && min) {
                //         return (max.getY() + getR(max)) - (min.getY() - getR(min));
                //     }
                // }
                // return r;
                return d.forceRadius;
            }
            );
        }

        this.simulation.tick();
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
            .force('link', d3.forceLink<AbstractNode, AbstractLink>()
                .strength(function (d: AbstractLink, i: number, data: AbstractLink[]) {
                    return d.source.isRoot() ? 0.0005 : 0.2;
                })
                .distance(1400))
            // @ts-ignore: Unreachable code error
            //  .force("charge", d3f.forceManyBodyReuse().distanceMax(100).strength(0.5))
            // .force('charge', d3.forceManyBody().distanceMax(100).strength(0.5))
            // .force("collide", d3.forceCollide<AbstractNode>().radius(d => Math.max(d.getRadius() * 4, 225))
            //     .iterations(4).strength(0.5))
            // .force("collide", d3.forceCollide<AbstractNode>().radius(120)
            //     .iterations(8).strength(0.4))
            .force(
                "y",
                d3.forceY()
                    .y(function (d: any) {
                        return 0;
                    })
                    .strength(0.01)
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
            node.updateForce();

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

        let f: ForceLink<D, AbstractLink<D>> | undefined = this.simulation.force<ForceLink<D, AbstractLink<D>>>("link");
        this.nodes = this.root.descendants();
        this.links = this.root.links();

        if (f) {
            f.links(this.links as any).strength(0);
        }
        this.simulation.nodes(this.nodes);

    }

    tick() {

        let simulationC = d3
            .forceSimulation([] as Array<D>)
            .force("column1", rectCollide(function (rect: AbstractNode) {
                return [100, rect.forceRadius];
            }).strength(0.3))
            .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
            .alphaMin(0.003)
            .alphaTarget(0.004)
            .stop();


        let y: ForceY<D> | undefined = this.simulation.force(
            "y"
        );

        if (y) {
            y.y(function (d: D) {
                return d.parent ? d.parent.getY() : d.getY();
            }).strength(function (d: D, i: number, data: D[]) {
                return d.parent ? d.parent.isRoot() ? 0.0005 : 0.015 : 0;
            })
        }

        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].tick();
            if (OverviewEngine.framecounter % 400 == 0) {
                if (this.nodes[i].getChildren().length == 0) {
                    this.nodes[i].updateForce();
                }
            }
        }

        if (OverviewEngine.framecounter % 400 == 0) {
            console.log("force update");

        }

        this.simulation.tick();

        this.quadtree = d3.quadtree<D>()
            .x(function (d) { return d.getX(); })
            .y(function (d) { return d.getY(); });

        this.quadtree.addAll(this.nodes);

    }
}
