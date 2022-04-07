import { AbstractLink, AbstractNode } from "./AbstractNode";
import { Simulation, ForceLink } from "d3";
import AbstractNodeTreeIfc from "./AbstractNodeTreeIfc";
import { Constructor } from "@/core/plugin/Constructor";
import { doBenchmark, logTime, logTimeGivenValue } from "@/core/utils/Benchmark";

export const MIN_TREE_COLUMN_WIDTH = 2500;

/**
 * This lists contains an Instacne for each class that extends the AbstractNodeLayout class.
 */
export const ListLayoutInstances: AbstractNodeLayout[] = [];

/**
 * The decorator has to be used on classes that extend the AbstractNodeLayout class. It collects
 * the Instances for them to the ListLayoutInstances.
 */
export function LayoutDecorator() {
    return function <T extends Constructor<AbstractNodeLayout>>(target: T) {
        ListLayoutInstances.push(new target());
    };
}

/**
 * Each Layout class needs to have an unique enum to identifiy the layout.
 */
export enum LayoutType {
    DEFAULT,
    STATICDYNAMIC,
    STATICDYNAMICX,
}

/**
 * The abstract class for Tree Layout for an Overview NodeTree. It handles the positioning of each node
 * and the drag/drop functionality of nodes. What you are exactly doing here with the positions of each node
 * is up to you. :) See the NodeLayoutStaticDynamicX class for an example of an fixed Layout calculaction with a
 * springforce simulation for the movement of the nodes.
 * 
 * So when you want to create a new Layout System, create you class that extends from this class here and 
 * set its enum ID as the activeID in the LayouterClass class. :)
 * 
 * This way the app can have an abitary number of layouts to switch between.
 */
export abstract class AbstractNodeLayout {

    public abstract nodesAdded(tree: AbstractNodeTreeIfc, nodesAdded: AbstractNode[]): void;

    /**
     * A unique enum for the Layout.
     */
    public readonly abstract id: LayoutType;

    /**
     * Is called whenever a node is added to a tree
     * @param tree The tree where the node was added to
     * @param parent The parent where the node was added to the list of children.
     * @param node The node that was added.
     */
    public abstract nodeAdded(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void;

    /**
     * One child node have been removed from the given node.
     * @param tree The tree were the node was removed from.
     * @param parent The parent of the node that "lost" the child node.
     * @param node The node where the child node was removed from.
     */
    public abstract nodeRemoved(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void;

    /**
     * Multiple Nodes have been removed from the given node.
     * @param tree The tree where the nodes were removed from.
     * @param parent The parent of the node that "lost" the nodes.
     * @param node The node where the nodes were removed from.
     */
    public abstract nodesRemoved(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void;

    /**
     * any kind of property for the given node has been updated.
     * @param tree The tree were the updated node belongs to.
     * @param parent The parent of the node that got updated.
     * @param node the node that got updated.
     */
    public abstract nodeUpdated(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void;

    /**
     * 1-n node(s) of the given Tree have been updated. The update can be their name, their positon or anything else.
     * @param tree 
     */
    public abstract nodesUpdated(tree: AbstractNodeTreeIfc): void;

    /**
     * This method is called for the three states of a drag&drop operation of a node. 
     * one for the "start" of the dragging, 1-n times for the "move" of the node and once for the "end" of the drag.
     * @param node 
     * @param type The Type of the drag state.
     * @param offset The offset of the mouse relative to the last call of this method while "move" is called 
     * @param transform The current scaling factor of the overview.
     */
    public abstract nodeDragged(node: AbstractNode, type: "start" | "move" | "end", offset: { x: number, y: number } | undefined, transform: { k: number }): void;

    /**
     * Feature data has been updated for the given tree.
     * @param tree 
     */
    public abstract featuresUpdated(tree: AbstractNodeTreeIfc): void;

    /**
     * Is called when an unspecified update to the tree happened. So you can assume to "rebuild" your data for that
     * tree completely.
     * @param tree 
     */
    public abstract treeUpdated(tree: AbstractNodeTreeIfc): void;

    /**
     * The Position that is returned here is used for rendering of the Node in the Overview.
     * @param n The position in the overview for the given Node.
     */
    public abstract getNodePosition(n: AbstractNode): { x: number, y: number };

    /**
     * Is called on each tick for the overview.
     * @param trees The NodeTrees of the Overview.
     * @param delta The time passed since the last call of this method.
     */
    public abstract tickLayout(trees: AbstractNodeTreeIfc[], delta: number): void;

}

/**
 * One of the first Layout Implementations that lack a lot of functionality.
 */
@LayoutDecorator()
class NodeLayoutDefault extends AbstractNodeLayout {
    public featuresUpdated(tree: AbstractNodeTreeIfc): void {

    }
    public nodeDragged(node: AbstractNode, type: "move" | "end"): void {

    }
    public nodesUpdated(tree: AbstractNodeTreeIfc): void {

    }

    public nodesAdded(tree: AbstractNodeTreeIfc, nodesAdded: AbstractNode[]): void {

    }

    public id: LayoutType = LayoutType.DEFAULT;

    mapSimulation: Map<AbstractNodeTreeIfc, Simulation<AbstractNode, AbstractLink<AbstractNode>>> = new Map();

    public treeUpdated(tree: AbstractNodeTreeIfc): void {
        let simulation = this.mapSimulation.get(tree);
        if (simulation) {

            let f: ForceLink<AbstractNode, AbstractLink<AbstractNode>> | undefined = simulation.force<ForceLink<AbstractNode, AbstractLink<AbstractNode>>>('link');

            if (f) f.links(tree.links);
            simulation.nodes(tree.nodes);
        }
    }

    public nodeRemoved(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {

    }
    public nodeUpdated(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {

    }
    public nodesRemoved(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {

    }

    public nodeAdded(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {

        let nodes: AbstractNode[] = tree.nodes;

        const listNodes = nodes.filter(n => n.getDepth() == parent.getDepth() + 1);

        listNodes.sort((a, b) => a.y - b.y);

        let bottom = listNodes.length ? listNodes[listNodes.length - 1] : undefined;
        let BottomFromList = bottom ? bottom.y + 150 : parent.y;
        let yfromParent = parent.y;


        node.y = Math.max(yfromParent, BottomFromList);

    }

    public tickLayout(trees: AbstractNodeTreeIfc[], delta: number): void {

    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: MIN_TREE_COLUMN_WIDTH * n.depth, y: n.y };
    }

}

/**
 * An older Version of the NodeLayoutStaticDynamicX without dynamic x positioning.
 */
@LayoutDecorator()
class NodeLayoutStaticDynamic extends AbstractNodeLayout {

    public featuresUpdated(tree: AbstractNodeTreeIfc): void { }

    public id: LayoutType = LayoutType.STATICDYNAMIC;

    static nodeBound: number = 200;
    static coolDownTime: number = 64; // in frames
    static minAlpha: number = 0.001; // cooldown starts when alpha in current tick is less then minAlpha
    static gravity: number = 0.00015; // gravity force vector strength to target position 
    static friction = 0.97;

    public nodeDragged(node: AbstractNode, type: "start" | "move" | "end", offset: { x: number, y: number } | undefined, t: { k: number }): void {
        switch (type) {
            case "start":

                /**
                 * This freezes the simulation of the nodes.
                 */
                node.fy = node.y; // Fix points
                let children = node.getDescendants(false);
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    child.customData["initDrag"] = { x: child.x, y: child.y, fx: child.fx, fy: child.fy };
                    child.fx = child.x;
                    child.fy = child.y;
                }

                node.customData["initDrag"] = { x: node.x, y: node.y, fx: node.fx, fy: node.fy };

                break;
            case "move":
                if (offset) {

                    offset = { x: (offset.x - node.customData["initDrag"].x) / t.k, y: (offset.y - node.customData["initDrag"].y) / t.k };


                    /**
                     * This freezes the simulation of the nodes.
                     */
                    node.fy = node.y = node.customData["initDrag"].y + offset.y;
                    let children = node.getDescendants(false);
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        const childInitPos = child.customData["initDrag"];
                        child.fy = child.y = childInitPos.y + offset.y;
                    }

                    if (node.parent) {
                        /**
                         * The "i" property is the index of the nodes for the layouting. by using the y value
                         * for that they are indexed after their y positions, which are the positon that can be changed
                         * by the dragging of the node.
                         */
                        node.parent.children.forEach(c => {
                            c.customData["i"] = c.y;
                            c.customData["co"] = { y: c.y, vy: 0 }
                        });
                        /**
                         * Recalculate the layout for the tree.
                         */
                        this.nodesUpdated(node.tree as any);
                    }
                }
                break;
            case "end":

                if (node.parent) {
                    node.parent.children.forEach(c => {
                        c.customData["i"] = c.y;
                        c.customData["co"] = { y: c.y, vy: 0 }
                    });
                }

                /**
                 * unfreeze the simulation for the nodes.
                 */
                node.getDescendants(false).forEach(c => c.customData["co"].vy = 0);
                if (node.tree) node.tree.nodes.forEach(n => { n.fy = undefined; n.fx = undefined });

                /**
                 * Recalculate the layout.
                 */
                this.nodesUpdated(node.tree as any);

                node.getDescendants(false).forEach(c => delete c.customData["initDrag"]);

                break;
            default:
                break;
        }
    }

    public nodesUpdated(tree: AbstractNodeTreeIfc): void {
        this.reheatTree(tree);
        this.updateLayout(tree.root)
    }

    public nodeRemoved(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatTree(tree);
        this.updateLayout(tree.root)
    }


    public nodesAdded(tree: AbstractNodeTreeIfc, nodesAdded: AbstractNode[]): void {

    }

    public nodeUpdated(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void { }

    public nodesRemoved(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatTree(tree);
        this.updateLayout(tree.root)
    }

    public treeUpdated(tree: AbstractNodeTreeIfc): void {
        this.reheatTree(tree);
        this.updateLayout(tree.root);
    }

    public nodeAdded(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {
        node.y = parent.children.length > 1 && parent.children[parent.children.length - 2].y ? parent.children[parent.children.length - 2].y : parent.y;
        this.reheatTree(tree);
        // layout update will be called later
    }

    /**
     * Creates a new layout for the given node and all of its descendants It firsts calculates the required
     * bounds for each node and then positions them.
     * @param node
     */
    private updateLayout(node: AbstractNode): void {
        this.calculateBounds(node);
        this.positionNodes(node);
    }

    /**
     * (Re-)activates the simulation for the given Tree.
     * @param tree 
     */
    public reheatTree(tree: AbstractNodeTreeIfc) { tree.customData["heat"] = { v: NodeLayoutStaticDynamic.coolDownTime }; };


    /**
     * This recursivly sums up the bounds of the nodes. This is the margin each nodes has in both Y directions 
     * to the next node. This makes sure no nodes or their links can overlap.
     * @param n 
     */
    calculateBounds(n: AbstractNode): void {

        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];
            this.calculateBounds(c);
        }

        if (n.children.length >= 1) {
            let b = 0;
            n.children.forEach(c => b += (c.customData["b"] != undefined ? c.customData["b"] as number : 0));
            n.customData["b"] = b;
        } else {
            n.customData["b"] = NodeLayoutStaticDynamic.nodeBound;
        }
    }

    /**
     * With the calculated bounds for each node we recursivly calculate the 
     * position for each node in the vertical layered graph drawing layout.
     * 
     * @param n 
     */
    positionNodes(n: AbstractNode): void {

        if (n.isRoot()) n.y = 0;

        // the bound of the node
        let bound = n.customData["b"] as number;

        // get the y positon of the node
        let coord = n.customData["co"] == undefined ? n.customData["co"] = { y: n.y, vy: 0 } : n.customData["co"];

        // the first child node is placed at top of the bound of the node.
        let yStart = (coord ? coord.y : n.y) - ((bound) / 2);

        // sort the children based on their given index values.
        n.children.forEach((c, i) => c.customData["i"] == undefined ? c.customData["i"] = i : "");
        n.children.sort((a, b) => (a.customData["i"] == undefined ? 0 : a.customData["i"]) - (b.customData["i"] == undefined ? 0 : b.customData["i"]))

        /**
         * The children of the node are positioned underneath each other with their bounds as margin between them.
         * This is list is positioned centered to the y position of the parent node. 
         */
        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];

            // the final y positon in the layout for the child node.
            const newY = yStart + (c.customData["b"] / 2);

            // init data for spring simulation and set the final position for it.
            let coordChild = c.customData["co"] == undefined ? c.customData["co"] = { y: newY, vy: 0 } : c.customData["co"];
            coordChild.y = newY;

            // the next positon for the next node.
            yStart += c.customData["b"] as number;
        }

        // now calculate the position for the child nodes.
        for (let i = 0; i < n.children.length; i++)  this.positionNodes(n.children[i]);

    }

    /**
    * We simulate the movement of the nodes to their final position in the layout by
    * using spring forces. The forces can be 
    * @param trees 
    * @param delta ms since last frame, about 5-40 (ms)
    */
    public tickLayout(trees: AbstractNodeTreeIfc[], delta: number): void {

        trees.forEach(tree => {

            let heat: { v: number } = tree.customData["heat"];
            if (heat == undefined) heat = tree.customData["heat"] = { v: NodeLayoutStaticDynamic.coolDownTime };

            if (heat.v > 0) {
                let alpha = 0;
                tree.nodes.forEach(n => {
                    const coord = n.customData["co"];

                    if (coord != undefined) {

                        // explicitEuler();
                        midpoint();

                        function explicitEuler() {
                            let dist = coord.y - n.y;
                            const abs = Math.abs(dist);

                            if (abs > 0 && abs < .01) n.y = coord.y;
                            else if (abs >= .01) {
                                coord.vy += dist * delta * NodeLayoutStaticDynamic.gravity;
                                if (n.fy == undefined) n.y += coord.vy *= NodeLayoutStaticDynamic.friction;
                                alpha += Math.abs(coord.vy);
                            }
                        }

                        function midpoint() {
                            const delta2 = delta / 2;
                            let dist = coord.y - n.y;
                            let abs = Math.abs(dist);

                            if (abs > 0 && abs < .01) n.y = coord.y;
                            else if (abs >= .01) {
                                // get acceleration at the half time step
                                let vy2 = coord.vy + dist * delta2 * NodeLayoutStaticDynamic.gravity;
                                let y2 = n.y + vy2 * NodeLayoutStaticDynamic.friction;
                                dist = coord.y - y2;

                                const accel = dist * delta * NodeLayoutStaticDynamic.gravity;
                                // use accerleration from half time step for the full time step
                                // with some random force for a more "natural" movement
                                coord.vy += accel * 0.65 + (accel * 0.35 * Math.random());

                                if (n.fy == undefined) n.y += coord.vy *= NodeLayoutStaticDynamic.friction;
                                alpha += Math.abs(coord.vy);
                            }
                        }


                        function midpointY() {
                            const delta2 = delta / 2;
                            let dist = coord.y - n.y;
                            let abs = Math.abs(dist);

                            if (abs > 0 && abs < .01) n.y = coord.y;
                            else {
                                // get acceleration at the half time step
                                let vy2 = coord.vy - dist * delta2 * NodeLayoutStaticDynamicX.stiffnessY;
                                let y2 = n.y + vy2 * NodeLayoutStaticDynamicX.dampingY;
                                dist = coord.y - y2;

                                const accel = dist * delta * NodeLayoutStaticDynamic.gravity;
                                // use accerleration from half time step for the full time step
                                // with some random force for a more "natural" movement
                                coord.vy -= accel * 0.65 + (accel * 0.35 * Math.random());

                                if (n.fy == undefined) n.y += coord.vy *= NodeLayoutStaticDynamicX.dampingY;
                                alpha += Math.abs(coord.vy);
                            }
                        }

                        function midpointX() {

                            const delta2 = delta / 2;
                            let dist = coord.x - n.x;
                            let abs = Math.abs(dist);

                            if (abs > 0 && abs < .01) {
                                n.x = coord.x;
                            } else {
                                // get acceleration at the half time step
                                let vx2 = coord.vx + dist * delta2 * NodeLayoutStaticDynamicX.stiffnessX;
                                let x2 = n.x + vx2 * NodeLayoutStaticDynamicX.dampingX;
                                dist = coord.x - x2;

                                const accel = dist * delta * NodeLayoutStaticDynamicX.stiffnessX;
                                // use accerleration from half time step for the full time step
                                // with some random force for a more "natural" movement
                                coord.vx += accel * 0.65 + (accel * 0.35 * Math.random());
                                if (n.fx == undefined) n.x += coord.vx *= NodeLayoutStaticDynamicX.dampingX;
                                alpha += Math.abs(coord.vx);

                            }
                        }


                    } else {
                        // n.y = n.parent ? n.parent.y : n.y;
                    }

                });

                // cooldown when minAlpha is reached or heat up till the maximum cooldowntime is reached.
                alpha < NodeLayoutStaticDynamic.minAlpha ? heat.v-- : heat.v += heat.v < NodeLayoutStaticDynamic.coolDownTime ? 1 : 0;
            }

        })


    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: MIN_TREE_COLUMN_WIDTH * n.depth, y: n.y };
    }

}

/**
 * The current, most complex Layout for a NodeTree, with working drag&drop support.
 * It updates the layout in realtime and simulates the movement of the nodes to their layout 
 * position by using spring forces. It freezes the simulation when the maximum velocity is low enough
 * for a certain amount of time.
 */
@LayoutDecorator()
class NodeLayoutStaticDynamicX extends AbstractNodeLayout {

    constructor() {
        super();
    }

    public featuresUpdated(tree: AbstractNodeTreeIfc): void { }

    public id: LayoutType = LayoutType.STATICDYNAMICX;

    /**
     * We disable the simulation for the dragged node and all of its descendants while they are dragged.
     * On each move of the drag operation we recalculate the Layout based on the current y positons of the nodes.
     * @param node 
     * @param type 
     * @param offset 
     * @param t 
     */
    public nodeDragged(node: AbstractNode, type: "start" | "move" | "end", offset: { x: number, y: number } | undefined, t: { k: number }): void {
        switch (type) {
            case "start":

                /**
                 * This freezes the simulation of the nodes.
                 */
                node.fy = node.y; // Fix points
                node.fx = node.x; // Fix points
                node.customData["initDrag"] = { x: node.x, y: node.y, fx: node.fx, fy: node.fy };

                let descendants = node.getDescendants(false);
                for (let i = 0; i < descendants.length; i++) {
                    const child = descendants[i];
                    child.customData["initDrag"] = { x: child.x, y: child.y, fx: child.fx, fy: child.fy };
                    child.fx = child.x;
                    child.fy = child.y;
                }

                break;
            case "move":
                if (offset) {

                    offset = { x: (offset.x - node.customData["initDrag"].x) / t.k, y: (offset.y - node.customData["initDrag"].y) / t.k };

                    node.fy = node.y = node.customData["initDrag"].y + offset.y;

                    /**
                     * This freezes the simulation of the nodes.
                     */
                    let children = node.getDescendants(false);
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        const childInitPos = child.customData["initDrag"];
                        child.fy = child.y = childInitPos.y + offset.y;

                    }

                    if (node.parent) {
                        /**
                        * The "i" property is the index of the nodes for the layouting. by using the y value
                        * for that they are indexed after their y positions, which are the positon that can be changed
                        * by the dragging of the node.
                        */
                        node.parent.children.forEach(c => {
                            c.customData["i"] = c.y;
                            c.customData["co"].y = c.y;
                            c.customData["co"].x = c.x;
                        });

                        /**
                          * Recalculate the layout.
                          */
                        this.nodesUpdated(node.tree as any);
                    }
                }
                break;
            case "end":

                if (node.parent) {
                    node.parent.children.forEach(c => {
                        c.customData["i"] = c.y;
                        c.customData["co"].y = c.y;
                        c.customData["co"].x = c.x;
                        // c.customData["co"] = { y: c.y, vy: 0, x: c.x, vx: 0 }
                    });
                }

                /**
                * unfreeze the simulation for the nodes.
                */
                node.getDescendants(true).forEach(c => { c.customData["co"].vy = 0, c.customData["co"].vx = 0 });
                if (node.tree) node.tree.nodes.forEach(n => { n.fy = undefined; n.fx = undefined });

                /**
                 * Recalculate the layout.
                 */
                this.nodesUpdated(node.tree as any);
                node.getDescendants(false).forEach(c => delete c.customData["initDrag"]);

                break;
            default:
                break;
        }
    }

    public nodesUpdated(tree: AbstractNodeTreeIfc): void {
        this.reheatTree(tree);
        this.updateLayout(tree.root)
    }

    public nodesAdded(tree: AbstractNodeTreeIfc, nodesAdded: AbstractNode[]): void {

    }

    public nodeRemoved(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatTree(tree);
        this.updateLayout(tree.root)
    }

    public nodeUpdated(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void { }

    public nodesRemoved(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatTree(tree);
        this.updateLayout(tree.root)
    }

    public treeUpdated(tree: AbstractNodeTreeIfc): void {
        this.reheatTree(tree);
        this.updateLayout(tree.root);
    }

    public nodeAdded(tree: AbstractNodeTreeIfc, parent: AbstractNode, node: AbstractNode): void {
        node.y = parent.y;
        node.x = parent.x;
        this.reheatTree(tree);
        // updateLayout() will be called later
    }

    mapColumnBounds: Map<number, number> = new Map();
    mapBounds: Map<number, number> = new Map();

    /**
    * (Re-)activates the simulation for the given Tree.
    * @param tree 
    */
    public reheatTree(tree: AbstractNodeTreeIfc) { tree.customData["heat"] = { v: NodeLayoutStaticDynamicX.coolDownTime }; };

    /**
    * Creates a new layout for the given node and all of its descendants It firsts calculates the required
    * bounds for each node and then positions them.
    * @param node
    */
    private updateLayout(node: AbstractNode): void {
        this.mapColumnBounds.clear();
        this.mapBounds.clear();
        this.calculateBounds(node);
        this.mapColumnBounds = new Map([...this.mapColumnBounds.entries()].sort());

        /**
         * Based on the largest bound in each column, calculate the width of the columns
         * by making sure the maximum angle is not exceeded. Stores the x positon of each column
         * in the mapBounds map.
         */
        let sum = 0;
        for (const [key, h] of this.mapColumnBounds.entries()) {
            const w = h / (2 * NodeLayoutStaticDynamicX.maxAngleTan);
            const x = Math.max(w, NodeLayoutStaticDynamicX.ColumnWidthMin);
            this.mapBounds.set(key, sum);
            sum += x;
        }
        this.positionNodes(node);
    }

    /**
      * This recursivly sums up the bounds of the nodes. This is the margin each nodes has in both Y directions 
      * to the next node. This makes sure no nodes or their links can overlap.
      * It also calculates the greates bound for each column of nodes in the tree, which is later used
      * for generating the x positon
      * @param n 
      */
    calculateBounds(n: AbstractNode): void {

        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];
            this.calculateBounds(c);
        }

        if (n.children.length >= 1) {
            let b = 0;
            n.children.forEach(c => b += (c.customData["b"] != undefined ? c.customData["b"] as number : 0));
            n.customData["b"] = b;

        } else {
            n.customData["b"] = NodeLayoutStaticDynamicX.nodeBound;
        }

        const maxBound = this.mapColumnBounds.get(n.depth);
        if (!maxBound || maxBound < n.customData["b"]) this.mapColumnBounds.set(n.depth, n.customData["b"]);

    }

    /**
     * With the calculated bounds for each node we recursivly calculate the 
     * position for each node in the vertical layered graph drawing layout.
     * 
     * @param n 
     */
    positionNodes(n: AbstractNode): void {

        // the bound of the node
        if (n.isRoot()) n.y = 0;

        let bound = n.customData["b"] as number;

        // get the y positon of the node
        let coord = n.customData["co"] == undefined ? n.customData["co"] = { y: n.y, vy: 0, x: n.x, vx: 0 } : n.customData["co"];

        // the first child node is placed at top of the bound of the node.
        let yStart = (coord ? coord.y : n.y) - ((bound) / 2);

        // sort the children based on their given index values.
        n.children.forEach((c, i) => c.customData["i"] == undefined ? c.customData["i"] = i : "");
        n.children.sort((a, b) => (a.customData["i"] == undefined ? 0 : a.customData["i"]) - (b.customData["i"] == undefined ? 0 : b.customData["i"]))

        /**
        * The children of the node are positioned underneath each other with their bounds as margin between them.
        * This is list is positioned centered to the y position of the parent node. 
        */
        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];

            /**
             * Get the x Position for the node from the mapBounds map where the x Position for each column (depth value) is stored.
             */
            const newY = yStart + (c.customData["b"] / 2);
            const xC = this.mapBounds.get(c.depth);

            // init data for spring simulation and set the final position for it.
            let coordChild = c.customData["co"] == undefined ? c.customData["co"] = { y: newY, vy: 0, x: xC ? xC : 0, vx: 0 } : c.customData["co"];
            coordChild.y = newY;
            coordChild.x = xC ? xC : 0;

            // the next positon for the next node.
            yStart += c.customData["b"] as number;
        }

        // now calculate the position for the child nodes.
        for (let i = 0; i < n.children.length; i++)  this.positionNodes(n.children[i]);

    }

    static maxAngle = 60; // maximum angle between the first or last child node and its parent node.
    static maxAngleTan = Math.tan(NodeLayoutStaticDynamicX.maxAngle * (Math.PI / 180));
    static nodeBound: number = 200; // bound for a node with children <= 1 
    static coolDownTime: number = 256; // in frames
    static minAlpha: number = 0.0003; // cooldown starts when alpha in current tick is less then minAlpha

    static ColumnWidthMin = 2100;

    static stiffnessX: number = .0005; // gravity force vector strength to target position 
    static dampingX = .003;

    static stiffnessY: number = .0003; // gravity force vector strength to target position 
    static dampingY = .0025;

    static randomness = 0.4; // how much (percentage) of the accelerations will be subtracted randomly

    /**
    * We simulate the movement of the nodes to their final position in the layout by
    * using spring forces. The forces can be computed with explicitEuler or midPoint.
    * @param trees 
    * @param delta ms since last frame, about 5-40 (ms)
    */
    public tickLayout(trees: AbstractNodeTreeIfc[], delta: number): void {

        if (doBenchmark && trees.length > 0) logTime("sim");

        trees.forEach(tree => {

            let heat: { v: number } = tree.customData["heat"];
            if (heat == undefined) heat = tree.customData["heat"] = { v: NodeLayoutStaticDynamicX.coolDownTime };

            if (heat.v > 0) {
                /**
                 * We determine the highest velocity from all nodes.
                 */
                let maxVelocity = 0;
                tree.nodes.forEach(n => {
                    const coord = n.customData["co"];

                    if (coord != undefined) {

                        if (true) {
                            explicitEuler("x", NodeLayoutStaticDynamicX.stiffnessX, NodeLayoutStaticDynamicX.dampingX);
                            explicitEuler("y", NodeLayoutStaticDynamicX.stiffnessY, NodeLayoutStaticDynamicX.dampingY);
                        } else {
                            midpoint("x", NodeLayoutStaticDynamicX.stiffnessX, NodeLayoutStaticDynamicX.dampingX)
                            midpoint("y", NodeLayoutStaticDynamicX.stiffnessY, NodeLayoutStaticDynamicX.dampingY)
                        }

                        function random(acc: number) {
                            return acc * (1 - NodeLayoutStaticDynamicX.randomness) + (acc * NodeLayoutStaticDynamicX.randomness * Math.random());
                        }

                        /**
                         * Calculate the next x or y position for the node with the given stiffnes and damping values
                         * with explicit euler integration.
                         * @param pos 
                         * @param stiffness 
                         * @param damping 
                         * @param vel 
                         */
                        function explicitEuler(pos: "x" | "y", stiffness = NodeLayoutStaticDynamicX.stiffnessY, damping = NodeLayoutStaticDynamicX.dampingY, vel = "v" + pos) {
                            let dist = coord[pos] - n[pos];
                            const acc = (stiffness * dist - damping * coord[vel]) * delta;
                            // add random force for a more "natural" movement
                            coord[vel] += random(acc);
                            if (n.fy == undefined) n[pos] += coord[vel];
                            maxVelocity = Math.max(maxVelocity, Math.abs(coord[vel]));
                        }
                        /**
                         * Calculate the next x or y position for the node with the given stiffnes and damping values
                         * with midpoint integration.
                         * @param pos 
                         * @param stiffness 
                         * @param damping 
                         * @param vel 
                         */
                        function midpoint(pos: "x" | "y", stiffness = NodeLayoutStaticDynamicX.stiffnessY, damping = NodeLayoutStaticDynamicX.dampingY, vel = "v" + pos) {
                            const timeHalf = delta / 2;
                            let dist = coord[pos] - n[pos];
                            // get acceleration at the half time step
                            let velHalf = (stiffness * dist - damping * coord[vel]) * timeHalf;
                            let yHalf = n[pos] + velHalf;
                            dist = coord[pos] - yHalf;
                            // use accerleration from half time step for the full time step
                            const acc = (stiffness * dist - damping * coord[vel]) * delta;
                            // add random force for a more "natural" movement
                            coord[vel] += random(acc);
                            if (n.fy == undefined) n[pos] += coord[vel];
                            maxVelocity = Math.max(maxVelocity, Math.abs(coord[vel]));

                        }

                    }

                });

                const heatold = heat.v;
                // cooldown when the maximum velocity is smaller then the minAlpha, otherwise heat it up until the maximum cooldowntime is reached.
                maxVelocity < NodeLayoutStaticDynamic.minAlpha ? heat.v-- : heat.v += heat.v < NodeLayoutStaticDynamic.coolDownTime ? 1 : 0;
                if (doBenchmark) logTimeGivenValue("velocity", maxVelocity);

                // set velocity to 0 if we hit zero on the cooldown
                if (heat.v == 0 && heatold == 1) (doBenchmark) ? console.log("Simulation freezed") : 0, tree.nodes.forEach(n => {
                    const coord = n.customData["co"];
                    if (coord) coord.vx = 0, coord.vy = 0;
                });
            }

        });

        if (doBenchmark && trees.length > 0) logTime("sim");

    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: n.x, y: n.y };
    }

}

/**
 * This class returns the current active AbstractNodeLayout class Instance. A static instance of it
 * is exported in this file for usage.
 */
class LayouterClass {

    static instance: LayouterClass = new LayouterClass();

    /**
     * The ENUM here Defines that AbstractNodeLayout Implementation that is doing the Layouting. Can also
     * be changed on the fly while the app is running.
     */
    activeId: LayoutType = LayoutType.STATICDYNAMICX;

    private constructor() { }

    getLayout(): AbstractNodeLayout {
        let layout = ListLayoutInstances.find(l => l.id == this.activeId);
        layout == undefined ? this.activeId = ListLayoutInstances[0].id : "";
        layout == undefined ? layout = ListLayoutInstances[0] : "";
        return layout;
    }

}

export const Layouter = LayouterClass.instance.getLayout();