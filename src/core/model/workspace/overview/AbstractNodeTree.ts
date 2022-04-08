import { Type, Exclude } from "class-transformer";
import * as d3 from "d3";
import { Quadtree } from "d3";
import path from "path";
import { AbstractLink, AbstractNode } from "./AbstractNode";
import AbstractNodeTreeIfc from "./AbstractNodeTreeIfc";
import { FeatureDataHandler } from "./FeatureData";
import { FeatureInstanceList } from "./AbstractFeature";
import { Layouter } from "./NodeLayout";
import FolderNode from "@/filesystem/model/FolderNode";
import { Features, FeatureType } from "./FeatureType";

/**
 * A listener class that gets informed when something in the tree changes. Is used by the 
 * OverviewEngine to get informed about changes, this way the AbstractNodeTree doesn't need to use
 * the OverviewEngine class as reference, which would lead to problems in the dependency graph.
 */
export interface NodeTreeListener<D extends AbstractNode = AbstractNode> {
    nodeAdded(node: D): void;
    nodesAdded(node: D[]): void;
    nodesUpdated(): void;
    featuresUpdated(): void;
}

/**
 * This class represents a Tree in the overview. The Tree contains a tree structure made out of AbstractNode Instances.
 * An AbstractNodeTree needs a specific AbstractNode Implementation which it contains as Nodes.
 * This class contains several methods to alter the structure of the tree. All changes will be notified to the OverviewEngine that
 * renders this tree and the AbstractNodeLayout Instance that handles the Layout for this tree.
 * @param N The AbstractNode Implementation the Tree uses.
 */
export abstract class AbstractNodeTree<N extends AbstractNode = AbstractNode> implements AbstractNodeTreeIfc {

    constructor(nt: string, path: string, root: N) {
        this.nt = nt;
        this.path = path;
        this.root = root;
        this.root.tree = this;
        this.nodes = this.root.getDescendants();
    }

    /**
     * EXTEND APP
     * 
     * When creating a new AbstractNode Implementation, add the class to the subtypes here
     * so the class can be loaded from JSON Data correctly.
     * 
     * The root node of the tree. 
     * 
     */
    @Type(() => AbstractNode, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'nt',
            subTypes: [
                { value: FolderNode, name: 'folder' },
            ],
        },
    })
    root: N;

    /**
     * Coordinates of the trees root node in the overview.
     */
    x: number = 0; y: number = 0;

    /**
     * unique id for this tree.
     */
    id!: number;

    /**
     * The absolute path to the root folder
     */
    path: string;

    /**
     * This property can contain any kind of data. This can be used by other code to store
     * informations about this tree. For example an implementation of the AbstractNodeLayout
     * could use that.
     */
    customData: { [any: string]: any } = {};

    /**
     * unique identifier for each class implementation for json serializing
     */
    nt: string; // node type

    /**
     * list of all nodes inside this tree. will be set everytime the amount of nodes changes.
     */
    @Exclude()
    nodes: N[] = [];

    /**
     * list of all links between the nodes in this tree. will be set everytime the amount of nodes changes.
     */
    @Exclude()
    links: AbstractLink[] = [];

    // used for selection in the overview, contains all the nodes of the tree.
    @Exclude()
    quadtree: Quadtree<N> | undefined;

    // tells if the data of this tree is synced in the moment
    @Exclude()
    public isSyncing = false;

    /**
     * The OverviewEngine Instance that renders this tree. Is 
     * used to inform the Instance when changes in the tree occurs.
     */
    @Exclude()
    engine: NodeTreeListener<AbstractNode> | undefined;

    /**
     * Returns a new Instance for the AbstractNode Implementation the tree
     * uses.
     * @param name The name for the created node.
     */
    public abstract createNodeInstance(name: string): N;

    /**
     * Returns the name that is display in the overview for the tree.
     */
    abstract getName(): string;

    /**
     * 
     * @param node the collection node for what the sub nodes should be loaded.
     */
    public abstract loadCollection(node: any): void;

    /**
     * Setup the list of nodes and the links. Also 
     * recreate the references to the parent node for all nodes.
     */
    public initAfterLoading(): void {

        this.nodes = this.root.getDescendants();
        this.links = this.root.getLinks();

        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            n.tree = this;
            for (let j = 0; j < n.children.length; j++) {
                const c = n.children[j];
                c.parent = n;
            }
        }
    }

    /**
     * Updates the name of a node.
     * @param oldPath The path to the node that should be renamed.
     * @param newPath The new name for the node. Can also be the path to the node, but the path
     * has do be the same as the old one, except for the name of the node.
     */
    public renameByPath(oldPath: string, newPath: string) {

        let node = this.getNodeByPath(oldPath);

        newPath = path.normalize(path.relative(this.path, newPath)).replace(/\\/g, "/");

        let newName = path.basename(newPath);

        if (node) {
            // the name renaming fires an nodeupdate event in the setter function
            node.name = newName;
        }

    }

    /**
     * Adds/Updates the Featues for the given nodes.
     * @param list A list of Features with their target nodes identified by the path.
     */
    public addFeaturesList(list: { path: string, features: Features }[]) {
        list.forEach(f => this.addFeatures(f.path, f.features, false));
        if (list.length > 0) this.featuresUpdated();
    }

    /**
     * Set the given Features to the node identified by the given path. 
     * The Features of the ascendent nodes are updates as well. When the node is not found
     * nothing is done with the Features.
     * @param path the path that idenfies the node where the features will be set.
     * @param features The FeatureData that will be set to the node.
     * @param fireUpdate fire an update to the OverviewEngine and the Layouter. true by default.
     */
    public addFeatures(path: string, features: Features, fireUpdate = true): void {

        let node = this.getNodeByPath(path);
        if (node) {
            node.features = features;

            let parent: N | undefined = node;

            while (parent) {

                // reset the recursive features so we can recalculate them. when the parent has data for itself, use this as the "base" for the recurisve data
                parent.featuresRecursive = parent.features ? JSON.parse(JSON.stringify(parent.features)) : {};
                let featuresParentRecurisve = parent.featuresRecursive;

                /**
                 * We recalculate the features for the parent node and then for all coming parent nodes.
                 * For that we combine the Features of all child nodes + the Features of the node itself.
                 */
                const childData = new Map<FeatureType, any[]>();

                for (let i = 0; i < parent.children.length; i++) {
                    const c = parent.children[i];
                    let childFeatures = c.featuresRecursive;
                    if (childFeatures) {

                        /**
                         * Iterate over all Features/Feature Data of the child node. When the parent is missing one of the Features, create a new instance for it. Collect all Data instances of the children in a list.
                         */
                        Object.keys(childFeatures).forEach((key: string) => {
                            let f: FeatureType = key as FeatureType;

                            if (childFeatures[f]) {

                                let dataArray = childData.get(f);
                                if (!dataArray) { dataArray = []; childData.set(f, dataArray); }
                                dataArray.push(childFeatures[f]);

                                // init the data for the features  if not available yet 
                                if (featuresParentRecurisve[f] == undefined) {

                                    if (FeatureInstanceList[f] != undefined) {

                                        const d: any = FeatureInstanceList[f]?.getNewDataInstance();
                                        if (d != undefined) featuresParentRecurisve[f] = d;
                                    }
                                }

                            }

                        })

                    }
                }

                /**
                 * Use the FeatureDataHandler instances to combine the children data for the parent
                 */
                childData.forEach((value: any[], key: FeatureType) => {
                    let f: FeatureType = key as FeatureType;

                    const dataParent = featuresParentRecurisve[f];
                    if (dataParent) {
                        const dataHandler = FeatureDataHandler[dataParent.t];
                        if (dataHandler) {
                            dataHandler(dataParent as any, value)
                        } else {
                            console.error("DataHandler for parent data not found", f);
                        }
                    } else {
                        console.error("Data of parent not found", f);

                    }
                })

                parent = parent.parent;
            }

        }

        if (fireUpdate) this.featuresUpdated();
    }

    /**
     * Adds multiple nodes by the given node description data. 
     * @param nodeDescriptions 
     * @param fireUpdate fire an update to the OverviewEngine and the Layouter. true by default.
     */
    public addNodesByPaths(nodeDescriptions: { path: string, collection: { size: number, depth: number } | undefined }[], fireUpdate: boolean = true) {

        const nodesAdded: N[] = [];

        nodeDescriptions.forEach(p => nodesAdded.push(...this.addNodeByPath(p.path, p.collection, false)));

        if (nodesAdded.length > 0 && fireUpdate) {
            this.updateNodeLists();
            this.nodesAdded(nodesAdded);
        }
    }

    /**
     * Adds a node to the tree. The Node is identified by a path from the root node to the new node.
     * All nodes that does not exists in this path will be created.
     * @param pathToNode the path that describes the node. Example: "C/Programs/Adobe/Photoshop" 
     * @param collection Defines the information for the node when it is a collection node. Is undefined when it is not a collection.
     * @param fireUpdate fire an update to the OverviewEngine and the Layouter. true by default.
     * @returns List of all created nodes.
     */
    public addNodeByPath(pathToNode: string, collection: { size: number, depth: number } | undefined, fireUpdate: boolean = true): N[] {

        const nodesAdded: N[] = [];

        pathToNode = path.normalize(path.relative(this.path, pathToNode)).replace(/\\/g, "/");
        if (pathToNode == ".") return nodesAdded;
        let folders: string[] = pathToNode.split("/");

        let foldersCreated = false;

        let currentFolder = this.root;
        for (let i = 0; i < folders.length; i++) {
            const f = folders[i];

            let childFound = currentFolder.children.find(c => c.name == f);
            if (childFound) {
                if (childFound.isCollection()) return nodesAdded; // do not add nodes to a collection
                // Child was found, go to next sub node
            } else {
                // Create new sub node
                foldersCreated = true;
                childFound = this.createNodeInstance(f);
                currentFolder.addChild(childFound);
                nodesAdded.push(childFound);

                if (i == folders.length - 1) {
                    // the sumbmitted node
                    if (collection && collection.size > 0) childFound.collectionData = collection;
                }
            }
            currentFolder = childFound;
        }

        if (foldersCreated && fireUpdate) {
            this.updateNodeLists();
        }

        return nodesAdded;

    }

    /**
     * Removes the node that is identified by the given path. When the node is not found, nothing is done.
     * @param nodePath the path that describes the node. Example: "C/Programs/Adobe/Photoshop" The Node 
     * Photoshop will be removed in this case.
     */
    public removeNodeByPath(nodePath: string) {

        let currentFolder: N | undefined = this.getNodeByPath(nodePath);

        // remove node if it exists.
        if (currentFolder && currentFolder.parent) {
            currentFolder.parent.removeChild(currentFolder);
            this.updateNodeLists();
        }
    }

    /**
     * Returns the node 
     * @param nodePath the path that describes the node. Example: "C/Programs/Adobe/Photoshop"
     * @returns 
     */
    public getNodeByPath(nodePath: string): N | undefined {

        nodePath = path.normalize(path.relative(this.path, nodePath)).replace(/\\/g, "/");
        if (nodePath == ".") return this.root;
        let folders: string[] = nodePath.split("/");

        let currentFolder: N | undefined = this.root;
        s:
        for (let i = 0; i < folders.length; i++) {
            const f = folders[i];

            let childFound: N | undefined = currentFolder.children.find(c => c.name == f);
            if (childFound) {
                currentFolder = childFound;
            } else {
                currentFolder = undefined;
                break s;
            }
        }
        return currentFolder;

    }

    /**
     * Set the coordinates for this tree, hence for the root node of the tree, in the overview. 
     * @param c 
     */
    public setCoordinates(c: { x: number, y: number }) {
        this.x = c.x;
        this.y = c.y;
    }

    /**
     * Calles the featuresUpdated() in the OverviewEngine and the Layouter Instances.
     */
    featuresUpdated() {
        this.engine?.featuresUpdated();
        Layouter.featuresUpdated(this);
    }

    /**
     * Calls the nodeUpdate() in the OverviewEngine and the Layouter Instances.
     * @param n 
     */
    nodeUpdate(n: N) {
        this.updateNodeLists();
        this.engine?.nodesUpdated();
        Layouter.nodeUpdated(this, n.parent as AbstractNode, n);
    }

    /**
     * Calls the nodeRemoved() in the OverviewEngine and the Layouter Instances.
     * @param node 
     */
    nodeRemoved(node: N) {
        this.updateNodeLists();
        this.engine?.nodesUpdated();
        Layouter.nodeRemoved(this, node.parent as AbstractNode, node);
    }

    /**
     * Calls the nodesRemoved() in the OverviewEngine and the Layouter Instances.
     * @param node 
     */
    nodesRemoved(node: N) {
        this.updateNodeLists();
        this.engine?.nodesUpdated();
        Layouter.nodesRemoved(this, node.parent as AbstractNode, node);
    }

    /**
     * Calls the nodeAdded() in the OverviewEngine and the Layouter Instances.
     * @param node 
     */
    nodeAdded(node: N) {
        this.engine?.nodeAdded(node);
        Layouter.nodeAdded(this, node.parent as AbstractNode, node);
    }

    /**
     * Calls the nodesAdded() in the OverviewEngine and the Layouter Instances.
     * @param nodesAdded 
     */
    nodesAdded(nodesAdded: N[]) {
        this.engine?.nodesAdded(nodesAdded);
        Layouter.nodesAdded(this, nodesAdded);
    }

    /**
     * Updates the list of all nodes and links for this entry.
     * Assign all nodes to the force simulation in case of new created nodes.
     */
    private updateNodeLists() {
        this.nodes = this.root.getDescendants();
        this.links = this.root.getLinks();
        Layouter.treeUpdated(this);
    }

    /**
     * Updates the quadtree on each tick so the quadtree contains the current coordinates for each node.
     */
    tickTree() {
        this.quadtree = d3.quadtree<N>().x(n => n.x).y(n => n.y).addAll(this.nodes);
    }
}
