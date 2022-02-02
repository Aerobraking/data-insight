import { OV_COLUMNWIDTH } from "@/core/components/overview/OverviewEngineValues";
import { Exclude, Expose } from "class-transformer";
import { Feature, NodeFeatures, NodeFeaturesClass } from "./AbstractNodeFeature";
import AbstractNodeShellIfc from "./AbstractNodeShellIfc";

export abstract class AbstractNode {

    constructor(nodetype: string, name: string) {
        this.nodetype = nodetype;
        this._name = name;
    }

    public getChildren() {
        return this.children;
    }

    public addChild(c: this, fireUpdate = true) {
        c.parent = this;
        c.shell = this.shell;
        c.depth = c.parents().length;
        this.children.push(c);
        if (fireUpdate) this.shell?.nodeAdded(c);
    }

    public removeChild(c: any) {
        let index = this.children.indexOf(c);
        if (index > -1) {
            this.children.splice(index, 1);
            this.shell?.nodeRemoved(c);
        }
    }


    public getRadius() {
        if (this.isRoot() ) {
            return 100;
        } else if (this.isCollection()) {
            return 80;
        } else if (this.shell) {
            let abs = (this.shell.root as AbstractNode).getFeatureValue(Feature.FolderSize);
            let part = this.getFeatureValue(Feature.FolderSize);
            if (abs != undefined && part != undefined) {
                let r = abs.s > 0 ? Math.sqrt(31415 * (part.s / abs.s) / Math.PI) : 1;
                r = 100 * 0.1 + r * 0.9;
                return Math.max(r, 16);
            }
        }
        return 16;
    }

    public canCreateCollection(): boolean {
        return !this.isCollection() && this.children.length > 0 && !this.isRoot();
    }

    public createCollection() {
        if (!this.canCreateCollection()) return;
        this.collectionData = { size: this.children.length, depth: Math.max(... this.descendants(false).map(c => c.depth - this.depth)) };
        this.children = [];
        this.shell?.nodeChildrenRemoved(this);
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
        if (this.shell) {
            this.shell.nodeUpdate(this);
        }
    }

    public getFeatureValue<K extends Feature>(key: K, recursive: boolean = true): NodeFeatures[K] | undefined {
        if (recursive) {
            if (this.featuresRecursive) {
                let e = this.featuresRecursive[key];
                if (e) {
                    return e;
                }
            }
        } else {
            if (this.features) {
                let e = this.featuresRecursive[key];
                if (e) {
                    return e;
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

    public getColumnData() {
        return { x: this.depth * OV_COLUMNWIDTH, width: OV_COLUMNWIDTH };
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
        let p = this.shell && absolute ? this.shell.path : "";
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

    @Expose({ name: 'f' })
    features: NodeFeaturesClass = {};

    @Expose({ name: 'fs' })
    featuresRecursive: NodeFeaturesClass = {};

    // used for debug informations
    @Exclude()
    flag: number = 0;

    /**
     * Our abstract AbstractNode class can't know the types of its children, as they are implemented classes of itself, which would lead to circular dependencies. So the childrens list is abstract and we have to Type() the list in the implemented classes.
     */
    @Expose({ name: 'c' })
    public abstract children: Array<this>;

    // the OverviewEntry this nodes belongs to. will be set after loading from the json
    @Exclude()
    shell: AbstractNodeShellIfc | undefined;

    // the depth inside the tree structure, relative to the root node
    @Expose({ name: 'd' })
    depth: number = 0;

    // string for json that links to the javascript implemented class
    nodetype: string;

    id?: string | number;

    fx?: number | undefined;
    fy?: number | undefined;

    /**
     * the name of this string, should be unique inside the parents node childrens list
     */
    @Expose({ name: 'n' })
    private _name: string;

    /**
     * Node’s zero-based index into nodes array.
     * This property is set during the initialization process of a simulation.
     */
    @Expose({ name: 'i' })
    index?: number | undefined;


    public isCollection(): boolean {
        return this.collectionData != undefined;
    }

    @Expose({ name: 'id' })
    collectionData: { size: number, depth: number } | undefined;

    /**
     * Node’s current x-position.
     */
    private _x?: number | undefined;
    /**
    * Node’s current y-position. Given by the d3 interface
    */
    y?: number | undefined;

    customData: { [any: string]: any } = {};
  
    // the parent node. will be set after loading from the json file.
    @Exclude()
    parent: this | undefined;
 
}

/**
 * Defines the Link between two AbstractNode instances. Extend it to use it with your AbstractNode subclass.
 */
export class AbstractLink<D extends AbstractNode = AbstractNode>  {
    constructor(source: D, target: D) {
        this.source = source;
        this.target = target;
    }
    source: D;
    target: D;
}