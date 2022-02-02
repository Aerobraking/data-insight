import { Type, Exclude } from "class-transformer";
import * as d3 from "d3";
import { Quadtree } from "d3";
import path from "path";
import { AbstractLink, AbstractNode } from "./AbstractNode";
import AbstractNodeShellIfc from "./AbstractNodeShellIfc";
import { NodeFeatures, Feature, FeatureDataHandler } from "./AbstractNodeFeature";
import { FeatureInstanceList } from "./AbstractNodeFeatureView";
import { Layouter } from "./NodeLayout";
import FolderNode from "@/filesystem/model/FolderNode";
import { ThermometerLines } from "mdue";

export interface NodeShellListener<D extends AbstractNode = AbstractNode> {
    nodeAdded(node: D): void;
    nodesAdded(node: D[]): void;
    nodesUpdated(): void;
    featuresUpdated(): void;
}

export abstract class AbstractNodeShell<N extends AbstractNode = AbstractNode> implements AbstractNodeShellIfc {

    constructor(nodetype: string, path: string, root: N) {
        this.nodetype = nodetype;
        this.path = path;
        this.root = root;
        this.id = Math.floor(Math.random() * 10000000);
        this.root.shell = this;
        this.nodes = this.root.descendants();
    }

    x: number = 0;
    y: number = 0;

    // the root node 
    @Type(() => AbstractNode, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'nodetype',
            subTypes: [
                { value: FolderNode, name: 'folder' },
            ],
        },
    })
    root: N;

    // unique id for this entry
    id: number;

    // The absolute path to the root folder
    path: string;

    customData: { [any: string]: any } = {};

    // disables the d3 force simulation when false
    public isSimulationActive: boolean = true;

    // identifier for json serializing
    nodetype: string;

    // list of all nodes inside this entry. will be set everytime the amount of nodes changes
    @Exclude()
    nodes: N[] = [];

    // list of all links between the nodes in this entry. will be set everytime the amount of nodes changes
    @Exclude()
    links: AbstractLink[] = [];

    // used for selection in the overview
    @Exclude()
    quadtree: Quadtree<N> | undefined;

    // tells if the data of this shell is synced in the moment
    @Exclude()
    public isSyncing = false;

    @Exclude()
    engine: NodeShellListener<AbstractNode> | undefined;

    public abstract loadCollection(node: any): void;

    public abstract createNode(name: string): N;

    abstract getName(): string;

    public initAfterLoading(): void {
        this.updateNodeLists();
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            n.shell = this;
            for (let j = 0; j < n.getChildren().length; j++) {
                const c = n.getChildren()[j];
                c.parent = n;
            }
        }
    }

    public renameByPaths(oldPath: string, newPath: string) {

        let node = this.getNodeByPath(oldPath);

        newPath = path.normalize(path.relative(this.path, newPath)).replace(/\\/g, "/");

        let newName = path.basename(newPath);

        if (node) {
            // the name renaming fires an nodeupdate event in the setter function
            node.name = newName;
        }

    }

    public addFeaturesList(list: { path: string, features: NodeFeatures }[]) {
        list.forEach(f => this.addFeatures(f.path, f.features, false));
        if (list.length > 0) this.featuresUpdated();
    }

    public addFeatures(path: string, features: NodeFeatures, fireUpdate = true) {

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
                const childData = new Map<Feature, any[]>();

                for (let i = 0; i < parent.getChildren().length; i++) {
                    const c = parent.getChildren()[i];
                    let childFeatures = c.featuresRecursive;
                    if (childFeatures) {

                        /**
                         * Iterate over all Features/Feature Data of the child node. When the parent is missing one of the Features, create a new instance for it. Collect all Data instances of the children in a list.
                         */
                        Object.keys(childFeatures).forEach((key: string) => {
                            let f: Feature = key as Feature;

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
                childData.forEach((value: any[], key: Feature) => {
                    let f: Feature = key as Feature;

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
     * 
     * @param nodePath  Absolute path 
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

            let childFound: N | undefined = currentFolder.getChildren().find(c => c.name == f);
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
    * 
    * @param nodePath Absolute path 
    * @param isCollection 
    * @param collectionSize 
    * @returns 
    */
    public addEntryPaths(paths: { path: string, isCollection: boolean, collectionSize: number }[], fireUpdate: boolean = true) {

        const nodesAdded: N[] = [];

        paths.forEach(p => {
            nodesAdded.push(...this.addEntryPath(p.path, p.isCollection, p.collectionSize,false));
        });

        if (nodesAdded.length > 0 && fireUpdate) {
            this.updateNodeLists();
            this.nodesAdded(nodesAdded);

        }
    }

    /**
     * 
     * @param nodePath Absolute path 
     * @param isCollection 
     * @param collectionSize 
     * @returns 
     */
    public addEntryPath(nodePath: string, isCollection: boolean = false, collectionSize: number = 0, fireUpdate: boolean = true): N[] {

        const nodesAdded: N[] = [];

        nodePath = path.normalize(path.relative(this.path, nodePath)).replace(/\\/g, "/");
        if (nodePath == ".") return nodesAdded;
        let folders: string[] = nodePath.split("/");

        let foldersCreated = false;
 
        let currentFolder = this.root;
        for (let i = 0; i < folders.length; i++) {
            const f = folders[i];

            let childFound = currentFolder.getChildren().find(c => c.name == f);
            if (childFound) {
                if (childFound.isCollection()) return nodesAdded; // do not add nodes to a collection
                // Child was found, go to next subfolder
            } else {
                // Create new sub folder
                foldersCreated = true;
                childFound = this.createNode(f);
                currentFolder.addChild(childFound);
                nodesAdded.push(childFound);

                if (i == folders.length - 1) {
                    // the sumbmitted folder
                    if (isCollection && collectionSize > 0) childFound.collectionData = { depth: 1, size: collectionSize };
                }
            }
            currentFolder = childFound;
        }

        if (foldersCreated && fireUpdate) {
            this.updateNodeLists();
        }

        return nodesAdded;

    }

    public removeEntryPath(relativePath: string) {

        relativePath = path.normalize(path.relative(this.path, relativePath)).replace(/\\/g, "/");
        let folders: string[] = relativePath.split("/");
        let currentFolder: N | undefined = this.root;

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
            this.updateNodeLists();
        }
    }

    public setCoordinates(c: { x: number, y: number }) {
        this.x = c.x;
        this.y = c.y;
    }

    public featuresUpdated() {
        this.engine?.featuresUpdated();
        Layouter.featuresUpdated(this);
    }
  
    public nodeUpdate(n: N) {
        this.updateNodeLists();
        this.engine?.nodesUpdated();
        Layouter.nodeUpdated(this, n.parent as AbstractNode, n);
    }

    public nodeRemoved(n: N) {
        this.updateNodeLists();
        this.engine?.nodesUpdated();
        Layouter.nodeRemoved(this, n.parent as AbstractNode, n);
    }

    public nodeChildrenRemoved(n: N) {
        this.updateNodeLists();
        this.engine?.nodesUpdated();
        Layouter.nodeChildrenRemoved(this, n.parent as AbstractNode, n);
    }

    public nodeAdded(c: N) {
        this.engine?.nodeAdded(c);
        Layouter.nodeAdded(this, c.parent as AbstractNode, c);
    }

    public nodesAdded(c: N[]) {
        this.engine?.nodesAdded(c);
        
    }

    /**
     * Updates the list of all nodes and links for this entry.
     * Assign all nodes to the force simulation in case of new created nodes.
     * @param reheat sets the alpha to one
     */
    protected updateNodeLists() {

        this.nodes = this.root.descendants();
        this.links = this.root.links();

        Layouter.shellContentUpdate(this);
    }

    tick() {
        this.quadtree = d3.quadtree<N>().x(n => n.getX()).y(n => n.getY()).addAll(this.nodes);
    }
}