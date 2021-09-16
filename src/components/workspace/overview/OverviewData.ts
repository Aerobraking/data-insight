import { Type, Exclude } from "class-transformer";
import * as d3 from "d3";
import { SimulationNodeDatum, SimulationLinkDatum, ForceCenter, Simulation, ForceLink } from "d3";
import { FolderNode, FolderOverviewEntry } from "./FileEngine";
import path from "path";
import { OverviewEngine } from "./OverviewEngine";
import TWEEN from "@tweenjs/tween.js";
import { Tween } from "@tweenjs/tween.js";


export abstract class AbstractNode implements SimulationNodeDatum {


    constructor(nodetype: string, name: string) {
        this.nodetype = nodetype;
        this._name = name;
    }

    @Type(() => FolderNode)
    private children: Array<this> = [];

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

    @Exclude()
    colorID: string | null = null;
    @Exclude()
    parent: this | undefined;
    @Exclude()
    entry: FolderOverviewEntry | undefined;
    depth: number = 0;
    nodetype: string;
    id?: string | number;
    hue?: number;
    private _name: string;
    public get name(): string {
        return this._name;
    }
    public set name(value: string) {
        this._name = value;
        if (this.entry) {
            this.entry.nodeUpdate();
        }
    }

    public isRoot(): boolean {
        return this.parent == undefined;
    }

    /**
     * Node’s zero-based index into nodes array.
     * This property is set during the initialization process of a simulation.
     */
    index?: number | undefined;
    /**
     * Node’s current x-position
     */
    private _x?: number | undefined;

    public get x(): number | undefined {
        // let x = this.parent ? this.entry ? this.entry?.getColumnX(this) : 200 * this.depth : this._x;
        let x = this.parent ? 500 * this.depth : this._x;
        return x;
    }

    public set x(value: number | undefined) {
        this._x = value;
    }

    r: number = 10;
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

    public getRadius() {
        return this.r ? this.r : 0;
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

        let _this = this;

        this.simulation = d3
            .forceSimulation([] as Array<D>)
            .force('link', d3.forceLink().strength(0.2))
            .force('charge', d3.forceManyBody().distanceMax(100).strength(0.5))
            .force("collide", d3.forceCollide<AbstractNode>().radius(d => d.getRadius() * 4).iterations(8).strength(1.5))
            .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
            .alphaMin(0.003)
            .alphaTarget(0.004)
            .stop();


        this.simulation.force(
            "y",
            d3.forceY()
                .y(function (d: any) {
                    return 0;
                })
                .strength(0.0015)
        );
    }

    @Type(() => FolderNode)
    root: D;

    // unique id for this entry
    id: number;

    // The absolute path to the root folder
    path: string;

    @Exclude()
    engine: EntryListener<AbstractNode> | undefined;

    isSimulationActive: boolean = true;

    // identifier for json serializing
    nodetype: string;

    @Exclude()
    simulation: Simulation<D, AbstractLink<D>>;
    @Exclude()
    nodes: AbstractNode[] = [];
    @Exclude()
    links: AbstractLink[] = [];

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

    public getNodeByPath(relativePath: string): AbstractNode | undefined {
        relativePath = path.normalize(path.relative(this.path, relativePath)).replace(/\\/g, "/");

        let folders: string[] = relativePath.split("/");

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
            this.simulation.restart();
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
            this.simulation.restart();
            this.updateSimulationData(false);
        }
    }

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

        for (let i = 0; i < this.root.descendants().length; i++) {
            const c = this.root.descendants()[i];
            c.fy = value;
        }
    }


    updateSimulationData(reheat: boolean = true) {

        if (reheat) {
            this.simulation.alpha(1);
        }

        this.simulation.nodes(this.root.descendants());

        let f: ForceLink<D, AbstractLink<D>> | undefined = this.simulation.force<ForceLink<D, AbstractLink<D>>>("force");

        if (f) {
            f.links(this.root.links());
        }

        this.nodes = this.root.descendants();
        this.links = this.root.links();
    }

    tick() {

        this.simulation.force(
            "y",
            d3.forceY<D>()
                .y(function (d: D) {
                    return d.parent ? d.parent.getY() : d.getY();
                })
                .strength(function (d: D, i: number, data: D[]) {
                    return d.parent ? 0.002 : 0;
                })
        );

        this.simulation.tick();

    }
}
