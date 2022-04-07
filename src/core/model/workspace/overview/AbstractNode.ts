import { Exclude, Expose } from "class-transformer";
import AbstractNodeTreeIfc from "./AbstractNodeTreeIfc";
import { FeatureType, Features } from "./FeatureType";

export abstract class AbstractNode {

    @Expose({ name: 'f' })
    features: Features = {};

    @Expose({ name: 'fs' })
    featuresRecursive: Features = {};

    // the depth inside the tree structure, relative to the root node
    @Expose({ name: 'd' })
    depth: number = 0;

    // string for json that links to the javascript implemented class
    @Expose({ name: 'nt' })
    nodeType: string;

    /**
     * When these values exist, the node is dragged. Otherwise they are undefined.
     * Todo: This should be moved into the customData property.
     */
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

    @Expose({ name: 'id' })
    collectionData: { size: number, depth: number } | undefined;

    @Expose({ name: 'cd' })
    customData: { [any: string]: any } = {};

    /**
    * Node’s current x position. 
    */
    x: number = 0;

    /**
    * Node’s current y position. 
    */
    y: number = 0;

    // the OverviewEntry this nodes belongs to. will be set after loading from the json
    @Exclude()
    tree: AbstractNodeTreeIfc | undefined;

    // the parent node. will be set after loading from the json file.
    @Exclude()
    parent: this | undefined;

    /**
     * Our abstract AbstractNode class can't know the types of its children,
     * as they are implemented classes of itself, which would lead to circular dependencies.
     * So the childrens list is abstract and we have to Type() the list in the implemented classes.
     */
    @Expose({ name: 'c' })
    public abstract children: Array<this>;

    constructor(nodeType: string, name: string) {
        this.nodeType = nodeType;
        this._name = name;
    }

    public getChildren() {
        return this.children;
    }

    public addChild(c: this, fireUpdate = true) {
        c.parent = this;
        c.tree = this.tree;
        c.depth = c.getAncestors().length;
        this.children.push(c);
        if (fireUpdate) this.tree?.nodeAdded(c);
    }

    public removeChild(c: any) {
        let index = this.children.indexOf(c);
        if (index > -1) {
            this.children.splice(index, 1);
            this.tree?.nodeRemoved(c);
        }
    }

    public canCreateCollection(): boolean {
        return !this.isCollection() && this.children.length > 0;
    }

    public createCollection(complete: boolean = false) {
        if (!this.canCreateCollection()) return;

        if (complete) {
            if (this.isRoot()) {
                this.children.forEach((c) => c.createCollection(complete));
            } else {
                this.collectionData = { size: this.children.length, depth: Math.max(... this.getDescendants(false).map(c => c.depth - this.depth)) };
                this.children = [];
                this.tree?.nodesRemoved(this);
            }
        } else {

            if (this.getDescendants(false).find(d => d.children.length > 0)) {
                // more then one level of children, make all possible children (that have only one level of children for themself) to collections.
                this.getDescendants(false).filter(d => d.children.length > 0 && d.getDescendants(false).find(d1 => d1.depth - d.depth > 1) == undefined).forEach(d => d.createCollection(true));
            } else {
                // only one level of children, make this node to a collection
                this.createCollection(true);
            }
        }

    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
        if (this.tree) {
            this.tree.nodeUpdate(this);
        }
    }

    public getFeatureValue<K extends FeatureType>(key: K, recursive: boolean = true): Features[K] | undefined {
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

    getDescendants(withItself: boolean = true): Array<this> {
        let a: Array<this> = [];
        if (withItself) {
            a.push(this);
        }

        for (let i = 0; i < this.children.length; i++) {
            this.collectNodes(this.children[i], a);
        }
        return a;
    }

    getAncestors(addItself: boolean = false, addRoot: boolean = true): Array<this> {
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
        let p = this.tree && absolute ? this.tree.path : "";
        const desc = this.getAncestors(this.parent ? true : false, !absolute);
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
    getLinks(): Array<AbstractLink<this>> {
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

    public isCollection(): boolean {
        return this.collectionData != undefined;
    }

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