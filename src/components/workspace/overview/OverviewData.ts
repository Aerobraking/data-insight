import { Type, Exclude } from "class-transformer";
import * as d3 from "d3";
import { SimulationNodeDatum, SimulationLinkDatum, ForceCenter, Simulation, ForceLink } from "d3";
import { FolderNode } from "./FileEngine";


export abstract class AbstractNode implements SimulationNodeDatum {


    constructor(nodetype: string) {
        this.nodetype = nodetype;
    }

    @Type(() => FolderNode)
    children: Array<this> = [];

    @Exclude()
    parent: this | undefined;
    depth: number = 0;
    nodetype: string;
    id?: string | number;
    hue?: number;

    /**
     * Node’s zero-based index into nodes array. 
     * This property is set during the initialization process of a simulation.
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

    public getX() {
        return this.x ? this.x : 0;
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

export abstract class AbstractOverviewEntry<D extends AbstractNode = AbstractNode> {

    constructor(nodetype: string, root: D) {
        this.nodetype = nodetype;
        this.root = root;
        this.root.fx = 0;
        this.root.fy = 0;

        this.simulation = d3
            .forceSimulation([] as Array<D>)
            .force('link', d3.forceLink())
            .force('charge', d3.forceManyBody())
            .force('center', d3.forceCenter())
            .force('dagRadial', null)
            .alphaMin(0.003)
            .alphaTarget(0.004)
            .stop();
    }

    @Type(() => FolderNode)
    root: D;

    nodetype: string;

    public setCoordinates(c: { x: number, y: number }) {
        this.x = c.x;
        this.y = c.y;

        let f: ForceCenter<AbstractNode> | undefined = this.simulation.force("center");
        if (f) {
            f.x(this.x);
            f.y(this.y);
        }
    }

    public get x(): number {
        return this.root.x ? this.root.x : 0;
    }

    public set x(value: number) {
        this.root.x = value;
        this.root.fx = value;
    }

    public get y(): number {
        return this.root.y ? this.root.y : 0;
    }

    public set y(value: number) {
        this.root.y = value;
        this.root.fy = value;
    }


    @Exclude()
    simulation: Simulation<D, AbstractLink<D>>;

    updateSimulationData() {
        this.simulation
            .alpha(1)
            .nodes(this.root.descendants());
        let f: ForceLink<D, AbstractLink<D>> | undefined = this.simulation.force<ForceLink<D, AbstractLink<D>>>("force");

        if (f) {
            f.links(this.root.links());
        }

    }

    tick() {
        this.simulation.tick();
    }
}
