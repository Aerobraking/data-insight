import { Type, Exclude } from "class-transformer";
import * as d3 from "d3";
import { SimulationNodeDatum, SimulationLinkDatum, Simulation, ForceLink, ForceY, Quadtree, ForceCollide } from "d3";
// import { FolderNode, FolderOverviewEntry } from "./FileEngine";
import path from "path";
import { COLUMNWIDTH, OverviewEngine } from "../../components/app/OverviewEngine";
import { Stats, StatsType } from "./FileSystem/FileOverviewInterfaces";
import CollideExtend from "@/utils/CollideExtend";
import { AbstractLink, AbstractNode, EntryListener, RectangleCollide } from "./OverviewData";
import AbstractOverviewEntryIfc from "./AbstractOverviewEntryIfc";
import FolderNode from "./FileSystem/FolderNode";



export abstract class AbstractOverviewEntry<N extends AbstractNode = AbstractNode> implements AbstractOverviewEntryIfc {

    constructor(nodetype: string, path: string, root: N) {
        this.nodetype = nodetype;
        this.path = path;
        this.root = root;
        this.id = Math.floor(Math.random() * 10000000);
        // @ts-ignore: Unreachable code error
        this.root.entry = this;

        this.nodes = this.root.descendants();

        this.root.fx = 0;
        this.root.fy = 0;

        this.simulation = d3
            .forceSimulation([] as Array<N>)
            .force('link', d3.forceLink<AbstractNode, AbstractLink>()
                .strength(function (d: AbstractLink, i: number, data: AbstractLink[]) {
                    // return d.source.isRoot() ? 0.0002 : 0.01;
                    return 100;
                }).distance(1).iterations(2)
            )
            // .force("collide", d3.forceCollide<D>().radius(d => {
            //     var r = d.getRadius() * 1.1;
            //     return r;
            // }).iterations(2).strength(0.3))
            .force(
                "y",
                d3.forceY()
                    .y(function (d: any) {
                        return 0;
                    })
                    .strength(0.0)
            )
            .force(
                "collideExt",
                CollideExtend()
                    .radius(function (d: any) {
                        return d.forceRadius;
                    })
                    .strength(0)
            )
            .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
            .alphaMin(0.003)
            .alphaTarget(0.004)
            .stop();

    }

    x: number = 0;
    y: number = 0;

    // the root node
    // @Type(() => FolderNode)
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

    @Exclude()
    engine: EntryListener<AbstractNode> | undefined;

    // disables the d3 force simulation when false
    public isSimulationActive: boolean = true;

    // identifier for json serializing
    nodetype: string;

    // the d3 simulation instance
    @Exclude()
    simulation: Simulation<N, AbstractLink<N>>;
    // list of all nodes inside this entry. will be set everytime the amount of nodes changes
    @Exclude()
    nodes: N[] = [];
    // list of all links between the nodes in this entry. will be set everytime the amount of nodes changes
    @Exclude()
    links: AbstractLink[] = [];
    @Exclude()
    quadtree: Quadtree<N> | undefined;

    public abstract loadCollection(node: any): void;

    public abstract initAfterLoading(): void;

    public abstract createNode(name: string): N;

    public renameByPaths(oldPath: string, newPath: string) {

        let node = this.getNodeByPath(oldPath);

        newPath = path.normalize(path.relative(this.path, newPath)).replace(/\\/g, "/");

        let newName = path.basename(newPath);

        if (node) {
            // the name renaming fires an nodeupdate event in the setter function
            node.name = newName;
        }

    }

    public addStats(stats: Stats) {
        let node = this.getNodeByPath(stats.path);
        if (node) {
            node.stats = stats;
            node.updateForce();

            let parent: N | undefined = node;

            while (parent) {

                // reset the recursive stats so we can recalculate them
                parent.statsRec = { path: "", stats: {} }
                if (parent.stats) {
                    parent.statsRec = JSON.parse(JSON.stringify(parent.stats));
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
                                    if (statsParent.stats[key] == undefined) {
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

    public getNodeByPath(absPath: string): N | undefined {
        absPath = path.normalize(path.relative(this.path, absPath)).replace(/\\/g, "/");

        let folders: string[] = absPath.split("/");

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

    public addEntryPath(relativePath: string, isCollection: boolean = false, collectionSize: number = 0) {
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

                if (i == folders.length - 1) {
                    // the sumbmitted folder
                    childFound.isCollection = isCollection;
                    childFound.collectionSize = collectionSize ? collectionSize : 0;
                }
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
            this.simulation.alpha(1);
            this.updateSimulationData(false);
        }
    }

    public setCoordinates(c: { x: number, y: number }) {
        this.x = c.x;
        this.y = c.y;
    }

    /**
     * One value contains a simulation with a list of RectangleCollide instances. each representing a nodes children list a
     * one large circle.
     * The depth starts at 2. 0 is the single root node. column one only contains nodes that belong to one childrens list,
     * so they are already colliding with each other.
     */
    columnForceMap: Map<number, Simulation<RectangleCollide<N>, undefined>> = new Map();

    public nodeUpdate() {
        this.engine?.nodeUpdate();
    }

    public nodeRemoved() {
        this.updateSimulationData();
        this.updateColumnForces();
        this.engine?.nodeUpdate();
    }

    public nodeAdded(c: N) {

        this.updateSimulationData();
        this.updateColumnForces();
        this.engine?.nodeAdded(c);

        const depth = c.getDepth();
        // if (depth > 1) {

        //     let f = this.columnForceMap.get(depth);
        //     if (!f) {
        //         f = d3
        //             .forceSimulation<RectangleCollide<D>>([] as Array<RectangleCollide<D>>)
        //             .force("collide", d3.forceCollide<RectangleCollide<D>>().radius(d => {
        //                 var r = d.radius * 1.1;
        //                 return r;
        //             }).iterations(2).strength(0.4))
        //             .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
        //             .alphaMin(0.003)
        //             .alphaTarget(0.004)
        //             .stop();
        //         this.columnForceMap.set(depth, f);
        //     }


        // }
    }

    /**
     * Updates the list of all nodes and links for this entry.
     * Assign all nodes to the force simulation in case of new created nodes.
     * @param reheat sets the alpha to one
     */
    protected updateColumnForces() {

        this.nodes = this.root.descendants();

        for (let i = 1, depth = i + 1; i < 0; i++, depth++) {
            const listNodes = this.nodes.filter(n => n.depth == i);
            if (listNodes) {
                let f = this.columnForceMap.get(depth);
                if (!f) {
                    f = d3
                        .forceSimulation<RectangleCollide<N>>([] as Array<RectangleCollide<N>>)
                        .force("collide", d3.forceCollide<RectangleCollide<N>>().radius(d => {
                            var r = d.radius * 1.1;
                            return r;
                        }).iterations(2).strength(1.0))
                        .force("charge", d3.forceManyBody<RectangleCollide<N>>().strength(d => {
                            var r = Math.max(1, Math.pow(d.radius, 1));
                            return 0;
                        }))
                        .alphaDecay(1 - Math.pow(0.001, 1 / 40000))
                        .alphaMin(0.003)
                        .alphaTarget(0.004)
                        .stop();
                    this.columnForceMap.set(depth, f);
                }

                f.alpha(1);

                const listRects = [];

                for (let j = 0; j < listNodes.length; j++) {
                    const n = listNodes[j];
                    if (n.getChildren().length) {
                        let r = new RectangleCollide(n);
                        listRects.push(r);
                    }

                }

                f.nodes(listRects);

            } else {
                // when no nodes are found, the maximum depth is reached.
                break;
            }

        }

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

        let f: ForceLink<N, AbstractLink<N>> | undefined = this.simulation.force<ForceLink<N, AbstractLink<N>>>('link');
        this.nodes = this.root.descendants();
        this.links = this.root.links();

        if (f) {
            f.links(this.links as any);
        }
        this.simulation.nodes(this.nodes);

    }

    tick() {

        let y: ForceY<N> | undefined = this.simulation.force(
            "y"
        );

        if (y) {
            y.y(function (d: N) {
                return d.parent ? d.parent.getY() : d.getY();
            }).strength(function (d: N, i: number, data: N[]) {
                // return d.parent ? d.parent.isRoot() ? 0.0005 : 0.001 : 0;
                return 1;
            })
        }

        let vyMax = 0;

        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].tick();
            if (OverviewEngine.framecounter % 400 == 0) {
                if (this.nodes[i].getChildren().length == 0) {
                    this.nodes[i].updateForce();
                }
            }
            let vy: number = this.nodes[i].vy ? this.nodes[i].vy as number : 0;
            vy = Math.abs(vy);
            vyMax = vy > vyMax ? vy : vyMax;
        }

        // if (OverviewEngine.framecounter % 60 == 0) {
        //     console.log("vyMax: ");
        //     console.log(vyMax);
        // }


        this.simulation.alpha(1);
        this.simulation.tick();

        // const columnForces = Array.from(this.columnForceMap.values());

        // for (let i = 0; i < columnForces.length; i++) {
        //     const f = columnForces[i];
        //     f.tick();
        // }

        this.quadtree = d3.quadtree<N>()
            .x(function (d) { return d.getX(); })
            .y(function (d) { return d.getY(); });

        this.quadtree.addAll(this.nodes);

        // console.log("update qTree", this.nodes.length);


    }
}
