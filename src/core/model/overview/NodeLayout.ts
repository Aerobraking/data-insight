import { AbstractLink, AbstractNode } from "./AbstractNode"; 
import { Simulation, ForceLink } from "d3";
import AbstractNodeShellIfc from "./AbstractNodeShellIfc"; 
import { Feature, FeatureDataType } from "./AbstractNodeFeature";
import { Constructor } from "@/core/plugin/Constructor";

export const Layouts: AbstractNodeLayout[] = [];
export function LayoutDecorator() {
    return function <T extends Constructor<AbstractNodeLayout>>(target: T) {
        Layouts.push(new target());
    };
}

export enum LayoutType {
    DEFAULT,
    STATIC,
    STATICDYNAMIC,
    STATICDYNAMICEXT,
}

export abstract class AbstractNodeLayout {

    public readonly abstract id: LayoutType;

    public abstract nodeAdded(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract featuresUpdated(shell: AbstractNodeShellIfc): void;
    public abstract nodesUpdated(shell: AbstractNodeShellIfc): void;
    public abstract nodeDragged(node: AbstractNode, type: "start" | "move" | "end", offset: { x: number, y: number } | undefined, transform: { k: number }): void;

    public abstract nodeChildrenRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    // public abstract shellAdded(shell:AbstractNodeShell):void;
    // public abstract shellRemoved(shell:AbstractNodeShell):void;

    public abstract tick(shells: AbstractNodeShellIfc[], delta: number): void;

    public abstract shellContentUpdate(shell: AbstractNodeShellIfc): void;

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: n.getX(), y: n.getY() };
    }
}

@LayoutDecorator()
class NodeLayoutDefault extends AbstractNodeLayout {
    public featuresUpdated(shell: AbstractNodeShellIfc): void {

    }
    public nodeDragged(node: AbstractNode, type: "move" | "end"): void {

    }
    public nodesUpdated(shell: AbstractNodeShellIfc): void {

    }

    public id: LayoutType = LayoutType.DEFAULT;

    mapSimulation: Map<AbstractNodeShellIfc, Simulation<AbstractNode, AbstractLink<AbstractNode>>> = new Map();

    public shellContentUpdate(shell: AbstractNodeShellIfc): void {
        let simulation = this.mapSimulation.get(shell);
        if (simulation) {

            let f: ForceLink<AbstractNode, AbstractLink<AbstractNode>> | undefined = simulation.force<ForceLink<AbstractNode, AbstractLink<AbstractNode>>>('link');

            if (f) f.links(shell.links);
            simulation.nodes(shell.nodes);
        }
    }

    public nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }
    public nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }
    public nodeChildrenRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }

    public nodeAdded(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

        let nodes: AbstractNode[] = shell.nodes;

        const listNodes = nodes.filter(n => n.getDepth() == parent.getDepth() + 1);

        listNodes.sort((a, b) => a.getY() - b.getY());

        let bottom = listNodes.length ? listNodes[listNodes.length - 1] : undefined;
        let BottomFromList = bottom ? bottom.getY() + 150 : parent.getY();
        let yfromParent = parent.getY();


        node.y = Math.max(yfromParent, BottomFromList);

    }

    public tick(shells: AbstractNodeShellIfc[], delta: number): void {

    }

}

@LayoutDecorator()
class NodeLayoutStatic extends AbstractNodeLayout {
    public featuresUpdated(shell: AbstractNodeShellIfc): void {
    }
    public nodeDragged(node: AbstractNode, type: "move" | "end"): void {
    }
    public nodesUpdated(shell: AbstractNodeShellIfc): void {

    }

    public nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }
    public nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }
    public nodeChildrenRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }

    public id: LayoutType = LayoutType.STATIC;

    mapSimulation: Map<AbstractNodeShellIfc, Simulation<AbstractNode, AbstractLink<AbstractNode>>> = new Map();

    public shellContentUpdate(shell: AbstractNodeShellIfc): void {
        this.calculateBounds(shell.root);
        this.positionNodes(shell.root);

        // let simulation = this.mapSimulation.get(shell);
        // if (simulation) {

        //     let f: ForceLink<AbstractNode, AbstractLink<AbstractNode>> | undefined = simulation.force<ForceLink<AbstractNode, AbstractLink<AbstractNode>>>('link');

        //     if (f) f.links(shell.links);
        //     simulation.nodes(shell.nodes);
        // }
    }

    static nodeBound: number = 100; // 260

    public nodeAdded(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        var startTime = performance.now()




        this.calculateBounds(shell.root);
        this.positionNodes(shell.root);

        var endTime = performance.now()
        const duration = Math.floor(endTime - startTime)

        var milliseconds = Math.floor((duration % 1000)),
            seconds = Math.floor((duration / 1000) % 60);

        // console.log(`Call took ${seconds + "." + milliseconds} s`)
    }

    private calculateBounds(n: AbstractNode): void {

        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];
            this.calculateBounds(c);
        }

        if (n.children.length > 1) {
            let b = 0;
            n.children.forEach(c => b += (c.customData["b"] != undefined ? c.customData["b"] as number : 0));
            n.customData["b"] = b;
        } else {
            n.customData["b"] = NodeLayoutStatic.nodeBound;
        }
    }

    private positionNodes(n: AbstractNode): void {

        if (n.isRoot()) n.y = 0;

        const childBound = n.children.length > 0 ? n.children.map(c => c.customData["b"] as number).reduce((p, n) => p + n) : NodeLayoutStatic.nodeBound;

        let yStart = n.getY() - (childBound / 2);


        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];


            c.y = yStart + (c.customData["b"] / 2);
            yStart += c.customData["b"] as number;


        }

        for (let i = 0; i < n.children.length; i++)  this.positionNodes(n.children[i]);

    }

    public tick(shells: AbstractNodeShellIfc[], delta: number): void {
        shells.forEach(shell => {

            // this.calculateBounds(shell.root);
            // this.positionNodes(shell.root);

        })
    }

}

@LayoutDecorator()
class NodeLayoutStaticDynamic extends AbstractNodeLayout {
  
    public featuresUpdated(shell: AbstractNodeShellIfc): void {
    }

    public id: LayoutType = LayoutType.STATICDYNAMIC;

    static nodeBound: number = 200;

    frictionNormal = 0.84;

    public nodeDragged(node: AbstractNode, type: "start" | "move" | "end", offset: { x: number, y: number } | undefined, t: { k: number }): void {
        switch (type) {
            case "start":
                this.frictionNormal = NodeLayoutStaticDynamic.friction;
                NodeLayoutStaticDynamic.friction = 0.65;

                node.fy = node.y; // Fix points
                node.customData["initDrag"] = { x: node.x, y: node.y, fx: node.fx, fy: node.fy };

                let children = node.descendants(false);
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    child.customData["initDrag"] = { x: child.x, y: child.y, fx: child.fx, fy: child.fy };
                    child.fx = child.x;
                    child.fy = child.y;
                }

                break;
            case "move":
                if (offset) {
                    this.reheatShell(node.shell as any);

                    offset = { x: (offset.x - node.customData["initDrag"].x) / t.k, y: (offset.y - node.customData["initDrag"].y) / t.k };

                    node.fy = node.y = node.customData["initDrag"].y + offset.y;

                    let children = node.descendants(false);
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        const childInitPos = child.customData["initDrag"];
                        child.fy = child.y = childInitPos.y + offset.y;

                    }

                    if (node.parent) {
                        node.parent.children.forEach(c => {
                            c.customData["i"] = c.getY();
                            c.customData["co"] = { y: c.getY(), vy: 0 }
                        });
                        this.nodesUpdated(node.shell as any);
                    }
                }
                break;
            case "end":
                this.reheatShell(node.shell as any);

                if (node.parent) {
                    node.parent.children.forEach(c => {
                        c.customData["i"] = c.getY();
                        c.customData["co"] = { y: c.getY(), vy: 0 }
                    });
                }

                node.descendants(false).forEach(c => c.customData["co"].vy = 0);
                if (node.shell) node.shell.nodes.forEach(n => { n.fy = undefined; n.fx = undefined });

                this.nodesUpdated(node.shell as any);

                NodeLayoutStaticDynamic.friction = this.frictionNormal;
                node.descendants(false).forEach(c => delete c.customData["initDrag"]);

                break;
            default:
                break;
        }
    }

    public nodesUpdated(shell: AbstractNodeShellIfc): void {
        this.reheatShell(shell);
        this.update(shell.root)
    }

    public nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatShell(shell);
        this.update(shell.root)
    }

    public nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void { }

    public nodeChildrenRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatShell(shell);
        this.update(shell.root)
    }

    public shellContentUpdate(shell: AbstractNodeShellIfc): void {
        this.reheatShell(shell);
    }

    public nodeAdded(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatShell(shell);
        node.y = parent.y;
        this.update(shell.root)
    }

    private update(node: AbstractNode): void {
        this.calculateBounds(node);
        this.positionNodes(node);
    }

    calculateBounds(n: AbstractNode): void {

        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];
            this.calculateBounds(c);
        }

        if (n.children.length >= 1) {
            let b = 0;
            n.children.forEach(c => b += (c.customData["b"] != undefined ? c.customData["b"] as number : 0));
            // b *= this.padding;
            n.customData["b"] = b;
        } else {
            n.customData["b"] = NodeLayoutStaticDynamic.nodeBound;
        }
    }

    static coolDownTime: number = 500; // in frames
    static minAlpha: number = 0.0003; // cooldown start when alpha in current tick is less then minAlpha
    static gravity: number = 0.0002; // cooldown start when alpha in current tick is less then minAlpha
    static friction = 0.94;

    positionNodes(n: AbstractNode): void {

        if (n.isRoot()) n.y = 0;

        let childBound = n.children.length > 0 ? n.children.map(c => c.customData["b"] as number).reduce((p, n) => p + n) : NodeLayoutStaticDynamic.nodeBound;

        let coord = n.customData["co"] == undefined ? n.customData["co"] = { y: n.getY(), vy: 0 } : n.customData["co"];

        let yStart = (coord ? coord.y : n.getY()) - ((childBound) / 2) /*+ (childBound / (this.padding * 10))*/;

        n.children.forEach((c, i) => c.customData["i"] == undefined ? c.customData["i"] = i : "");
        n.children.sort((a, b) => (a.customData["i"] == undefined ? 0 : a.customData["i"]) - (b.customData["i"] == undefined ? 0 : b.customData["i"]))

        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];

            const newY = yStart + (c.customData["b"] / 2);

            let coordChild = c.customData["co"] == undefined ? c.customData["co"] = { y: newY, vy: 0 } : c.customData["co"];
            coordChild.y = newY;

            yStart += c.customData["b"] as number;
        }

        for (let i = 0; i < n.children.length; i++)  this.positionNodes(n.children[i]);

    }

    public reheatShell(shell: AbstractNodeShellIfc) { shell.customData["heat"] = { v: NodeLayoutStaticDynamic.coolDownTime }; };

    /**
     * 
     * @param shells 
     * @param delta ms since last frame, about 5-40 (ms)
     */
    public tick(shells: AbstractNodeShellIfc[], delta: number): void {

        shells.forEach(shell => {

            let heat: { v: number } = shell.customData["heat"];
            if (heat == undefined) heat = shell.customData["heat"] = { v: NodeLayoutStaticDynamic.coolDownTime };

            if (heat.v > 0) {
                let alpha = 0;
                shell.nodes.forEach(n => {
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
                                // use accerleration from halt time step for the full time step
                                coord.vy += accel * 0.65 + (accel * 0.35 * Math.random());

                                if (n.fy == undefined) n.y += coord.vy *= NodeLayoutStaticDynamic.friction;
                                alpha += Math.abs(coord.vy);
                            }
                        }


                    } else {
                        n.y = n.parent ? n.parent.getY() : n.getY();
                    }

                });

                // cooldown when minAlpha is reached or heat up till the maximum cooldowntime is reached.
                alpha < NodeLayoutStaticDynamic.minAlpha ? heat.v-- : heat.v += heat.v < NodeLayoutStaticDynamic.coolDownTime ? 1 : 0;
            }

        })


    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: n.getX(), y: n.getY() };
    }

}

@LayoutDecorator()
class NodeLayoutStaticDynamicExt extends NodeLayoutStaticDynamic {

    public id: LayoutType = LayoutType.STATICDYNAMICEXT;

    calculateBounds(n: AbstractNode): void {

        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];
            this.calculateBounds(c);
        }

        if (n.children.length > 0) {
            let b = 0;
            let oneColumnBound = 0;
            let lastBigNodeBound: number | undefined = 0;
            let y = 0;

            n.children.forEach((c, i) => c.customData["i"] == undefined ? c.customData["i"] = i : "");
            n.children.sort((a, b) => (a.customData["i"] == undefined ? 0 : a.customData["i"]) - (b.customData["i"] == undefined ? 0 : b.customData["i"]))

            n.children.forEach((c, i) => {
                let cBound = (c.customData["b"] != undefined ? c.customData["b"] as number : 0);

                if (cBound == NodeLayoutStaticDynamicExt.nodeBound && c.children.length == 0) {
                    if (oneColumnBound == 0 && lastBigNodeBound) {
                        oneColumnBound -= lastBigNodeBound / 2;
                        lastBigNodeBound = undefined;
                    }
                    c.customData["rel"] = y;
                    y += cBound; // just take the next row, no matter if we are inside a bound or not
                    oneColumnBound += cBound;
                } else {
                    let diff = oneColumnBound - (cBound / 2);

                    let toAdd = diff >= 0 ? diff + (cBound / 2) : Math.abs(diff) + (cBound / 2);

                    b += toAdd;
                    oneColumnBound = 0;
                    lastBigNodeBound = cBound;

                    y += Math.max(0, -diff) + NodeLayoutStaticDynamicExt.nodeBound;
                    c.customData["rel"] = y; // take the minimum distance + the offset we "saved"
                    y += NodeLayoutStaticDynamicExt.nodeBound;
                }
                // b += (c.customData["b"] != undefined ? c.customData["b"] as number : 0)
                // c.featuresRecursive[Feature.FolderQuantity] = { s: c.customData["rel"], t: FeatureDataType.SUM };
            });

            b += oneColumnBound;

            n.customData["b"] = b;
            n.featuresRecursive[Feature.FolderQuantity] = { s: n.customData["b"], t: FeatureDataType.SUM };
        } else {
            n.customData["b"] = NodeLayoutStaticDynamicExt.nodeBound;
            n.featuresRecursive[Feature.FolderQuantity] = { s: n.customData["b"], t: FeatureDataType.SUM };
        }
    }

    positionNodes(n: AbstractNode): void {

        if (n.isRoot()) n.y = 0;

        let childBound = n.customData["b"] as number;

        let coord = n.customData["co"] == undefined ? n.customData["co"] = { y: n.getY(), vy: 0 } : n.customData["co"];

        let yStart = (coord ? coord.y : n.getY()) - ((childBound) / 2) /*+ (childBound / (this.padding * 10))*/;

        // n.children.forEach((c, i) => c.customData["i"] == undefined ? c.customData["i"] = i : "");
        // n.children.sort((a, b) => (a.customData["i"] == undefined ? 0 : a.customData["i"]) - (b.customData["i"] == undefined ? 0 : b.customData["i"]))

        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];
            const yRel = c.customData["rel"] != undefined ? c.customData["rel"] : 0;


            const newY = (n.getY() - (childBound / 2)) + yRel;
            // c.featuresRecursive[Feature.FolderQuantity] = { s: c.children.length > 0 ? childBound : newY - n.getY(), t: FeatureDataType.SUM };
            console.log(newY, n.getY(), childBound / 2, yRel, n.name);

            let coordChild = c.customData["co"] == undefined ? c.customData["co"] = { y: newY, vy: 0 } : c.customData["co"];
            coordChild.y = newY;

            yStart = newY;
        }

        for (let i = 0; i < n.children.length; i++)  this.positionNodes(n.children[i]);

    }
}

class LayouterClass {

    static instance: LayouterClass = new LayouterClass();

    activeId: LayoutType = LayoutType.STATICDYNAMIC;

    private constructor() { }

    public shellContentUpdate(shell: AbstractNodeShellIfc): void {
        this.getLayout().shellContentUpdate(shell);
    }
    getLayout(): AbstractNodeLayout {
        let layout = Layouts.find(l => l.id == this.activeId);
        layout == undefined ? this.activeId = Layouts[0].id : "";
        layout == undefined ? layout = Layouts[0] : "";
        return layout;
    }

    public addNode(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.getLayout().nodeAdded(shell, parent, node);
    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } { return this.getLayout().getNodePosition(n); }
}

export const Layouter = LayouterClass.instance.getLayout();