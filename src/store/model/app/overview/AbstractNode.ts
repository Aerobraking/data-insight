import { OV_COLUMNWIDTH } from "@/components/app/OverviewEngineValues";
import { Type, Exclude } from "class-transformer";
import * as d3 from "d3";
import { SimulationNodeDatum, SimulationLinkDatum, Simulation, ForceLink, ForceY, Quadtree, ForceCollide } from "d3";
// import { COLUMNWIDTH } from "../../components/app/OverviewEngine";
import { Stats } from "../../implementations/filesystem/FileOverviewInterfaces";

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
        if (this.entry) this.entry.root.collectNodes(this.entry.root, nodes);

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

    public removeChild(c: any) {
        let index = this.children.indexOf(c);
        if (index > -1) {
            this.children.splice(index, 1);
            console.log(this);
            console.log(this.entry);
            this.entry?.nodeRemoved();
            this.updateSimulation();
            this.updateForce();
        }
    }

    public updateForce() {

        if (!this.children) return;

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
                r = 100 * 0.1 + r * 0.9;
                return Math.max(r, 16);
            }
        }
        return 16;
    }

    public updateSimulation() {
        this.simulation.nodes(this.children);
    }

    // used for debug informations
    @Exclude()
    flag: number = 0;
    forceRadius: number = 16;

    // the d3 simulation instance
    @Exclude()
    simulation: Simulation<this, AbstractLink<this>>;

    /**
     * Our abstract AbstractNode class can't know the types of its children, as they are implemented classes of itself, which would lead to circular dependencies. So the childrens list is abstract and we have to Type() the list in the implemented classes.
     */
    public abstract children: Array<this>;

    // the colorid for the overview engine, will be generated on the fly while rendering
    @Exclude()
    colorID: string | null = null;

    // the parent node. will be set after loading from the json file.
    @Exclude()
    parent: this | undefined;

    // the OverviewEntry this nodes belongs to. will be set after loading from the json
    @Exclude()
    entry: {
        nodeUpdate(): void;
        nodeRemoved(): void;
        path: string;
        root: any;
        x:number;
        y:number;
        simulation: any;
        id: number;
        isSimulationActive: boolean;
        nodeAdded(node: any): void;
        loadCollection(node: any): void;
    } | undefined;

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

    isCollection: boolean = false;
    collectionSize: number = 0;

    /**
   * Node’s current x-position.
   */

    private _x?: number | undefined;
    /**
    * Node’s current y-position. Given by the d3 interface
    */
    y?: number | undefined;
    /**
     * Node’s current x-velocity. Given by the d3 interface
     */
    vx?: number | undefined;
    /**
     * Node’s current y-velocity. Given by the d3 interface
     */
    vy?: number | undefined;
    /**
     * Node’s fixed x-position (if position was fixed). Given by the d3 interface
     */
    fx?: number | null | undefined;
    /**
     * Node’s fixed y-position (if position was fixed). Given by the d3 interface
     */
    fy?: number | null | undefined;

    public createCollection() {
        this.collectionSize = this.children.length;
        this.children = [];
        this.isCollection = true;
        this.entry?.nodeRemoved();
        this.updateSimulation();
        this.updateForce();
    }

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
    /**
     * The x position of the nodes are defined  by the OV_COLUMNWIDTH and depth value (OV_COLUMNWIDTH*depth), only the root node uses this as an actual node. 
     */
    public get x(): number | undefined {
        // let x = this.parent ? this.entry ? this.entry?.getColumnX(this) : 200 * this.depth : this._x;
        let x = this.parent ? OV_COLUMNWIDTH * this.depth : this._x;
        x = this._x ? this._x : x;
        return x;
    }

    public set x(value: number | undefined) {
        this._x = value;
    }



    public getX() {
        return OV_COLUMNWIDTH * this.depth;
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

    parents(addItself: boolean = false, addRoot: boolean = true): Array<this> {
        let a: Array<this> = [];
        let p = this;
        if (addItself) {
            a.push(p);
        }
        while (p.parent) {
            if (addRoot || p.parent.parent) {
                a.push(p.parent);
            }
            p = p.parent;
        }
        return a;
    }

    getPath(absolute: boolean = true): string {
        let p = this.entry && absolute ? this.entry.path : "";
        const desc = this.parents(this.parent ? true : false, !absolute);
        desc.reverse();
        for (let i = 0; i < desc.length; i++) {
            let e: this = desc[i];
            p += "/" + e.name;
        }
        return p;
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