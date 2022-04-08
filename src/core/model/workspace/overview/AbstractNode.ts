import { Exclude, Expose } from "class-transformer";
import AbstractNodeTreeIfc from "./AbstractNodeTreeIfc";
import { FeatureType, Features } from "./FeatureType";

/**
 * This class represents a single Node in AbstractNodeTree. 
 * We excessively use the Expose() method of the class-transformer here to shorten the property keys because they can appear
 * a lot of times in the JSON Data and therefore take a lot of space. 
 */
export abstract class AbstractNode {

    /**
     * The Features for this node, which are key-value entries, where the key
     * is the Feature Enum and the Value the corresponding FeatureData Object.
     */
    @Expose({ name: 'f' })
    features: Features = {};

    /**
    * The Combination of Features for this node and all underlying Nodes. Is stored as key-value entries, where the key
    * is the Feature Enum and the Value the corresponding FeatureData Object.
    */
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
     * the name of this node, should be unique inside the parents node childrens list.
     */
    @Expose({ name: 'n' })
    private _name: string;

    /**
     * Node’s zero-based index into nodes array.
     * This property is set during the initialization process of a simulation.
     */
    @Expose({ name: 'i' })
    index?: number | undefined;

    /**
     * This data describes the properties for this node when it is a collection.
     * Is undefined when it is not a collection.
     * @param size: How many nodes are inside this collection.
     * @param depth: How deep is the tree structure starting from this node with depth 0.
     */
    @Expose({ name: 'id' })
    collectionData: { size: number, depth: number } | undefined;

    /**
      * This property can contain any kind of data. This can be used by other code to store
      * informations about this node. For example an implementation of the AbstractNodeLayout
      * could use that for storing data about the layouting.
      */
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

    /**
     * Adds the given node to the list of child nodes and fires an update to the tree.
     * @param childNode The node that you want to add
     * @param fireUpdate true: an update is fired to the tree, false: no update is fired.
     */
    public addChild(childNode: this, fireUpdate = true): void {
        childNode.parent = this;
        childNode.tree = this.tree;
        childNode.depth = childNode.getAncestors().length;
        this.children.push(childNode);
        if (fireUpdate) this.tree?.nodeAdded(childNode);
    }

    /**
     * Removes the given node from the list of child nodes and fires an update to the tree.
     * @param childNode The node that should be removed.
     */
    public removeChild(childNode: any) {
        let index = this.children.indexOf(childNode);
        if (index > -1) {
            this.children.splice(index, 1);
            this.tree?.nodeRemoved(childNode);
        }
    }

    /** 
     * @returns true: This node can be converted to a Collection Node. false: This Node can not be converted
     * because it is already a Collection or isn't allowed to be one (the root node or a root without child nodes).
     */
    public canCreateCollection(): boolean {
        return !this.isCollection() && this.children.length > 0;
    }

    /**
     * Converts the most distant sub nodes to collections or this node itself.
     * Does nothing when creating (a) collection(s) is not possible.
     * @param complete true: Converts this node to a collection, false: Converts the most distant sub nodes to collections
     */
    public createCollection(complete: boolean = false): void {
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

    /** 
     * @param key The FeatureType Enum that identifies the Feature you want to get
     * @param recursive true: Returns the recursive FeatureData that represents the features of all subnodes false: Returns only the FeatureData for this node.
     * @returns The FeatureData to the given node or undefined when the Data is not available.
     */
    public getFeatureValue<K extends FeatureType>(key: K, recursive: boolean = true): Features[K] | undefined {
        if (recursive) {
            if (this.featuresRecursive) {
                let e = this.featuresRecursive[key];
                if (e) return e;
            }
        } else {
            if (this.features) {
                let e = this.features[key];
                if (e) return e;
            }
        }
        return undefined;
    }

    /**
     * @returns true: This node is the root node in the tree.
     */
    public isRoot(): boolean {
        return this.parent == undefined;
    }

    /**
     * @returns The depth of this node in its tree. The root node has a depth of 0. 
     */
    public getDepth(): number {
        this.depth = 0;
        let p: this = this;
        while (p.parent) {
            this.depth++;
            p = p.parent;
        }
        return this.depth;
    }

    /**
     * Collects all underlying nodes for this node (including itself) in the tree structure.
     * @param node The node where the collecting should start
     * @param arrayNodes The array where the nodes will be pushed into. 
     */
    private collectNodes(arrayNodes: Array<this> = [], node: this = this): void {
        arrayNodes.push(node);

        for (let i = 0; i < node.children.length; i++) {
            let c: this = node.children[i];
            this.collectNodes(arrayNodes, c);
        }
    }

    /** 
     * @param withItself includes this node in the array, true by default.
     * @returns An array with all nodes that are "inside/under" this node in the tree structure.
     */
    getDescendants(withItself: boolean = true): Array<this> {
        let a: Array<this> = [];
        if (withItself) a.push(this);

        for (let i = 0; i < this.children.length; i++) {
            this.collectNodes(a, this.children[i]);
        }
        return a;
    }

    /**
     * 
     * @param addItself includes this node in the array, false by default.
     * @param addRoot add the root node to the list, true by default.
     * @returns An array with all parent nodes up to the root node in the tree structure.
     */
    getAncestors(addItself: boolean = false, addRoot: boolean = true): Array<this> {
        let a: Array<this> = [];
        let p = this;
        if (addItself) a.push(p);
        while (p.parent) {
            if (addRoot || p.parent.parent) a.push(p.parent);
            p = p.parent;
        }
        return a;
    }

    /**
     * 
     * @param absolute true: When the tree itself has a path it will be added to the path.  
     * @returns A string that describes the path to the node, with the names of the nodes separated by "/"
     */
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
        this.collectLinks(a);
        return a;
    }

    /**
     * Fills the given array with Link instances tha describe the links between parent and child nodes {source: parentNode, target: childNode}.
     * Will be created for all nodes beneath this node (including itself) in the tree structure
     * @param arrayLinks The array where the Links will be pushed into.
     * @param node The node where you want start the Link generation 
     */
    private collectLinks(arrayLinks: Array<AbstractLink<this>>, node: this = this): void {
        for (let i = 0; i < node.children.length; i++) {
            let c: this = node.children[i];
            arrayLinks.push({ source: node, target: c });
            this.collectLinks(arrayLinks, c);
        }
    }

    public isCollection(): boolean {
        return this.collectionData != undefined;
    }

}

/**
 * Defines the Link between two AbstractNode instances which are in a parent-child relationship. Extend it to use it with your AbstractNode subclass.
 */
export class AbstractLink<D extends AbstractNode = AbstractNode>  {
    constructor(source: D, target: D) {
        this.source = source;
        this.target = target;
    }
    source: D;
    target: D;
}