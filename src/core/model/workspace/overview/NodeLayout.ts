import { AbstractLink, AbstractNode } from "./AbstractNode";
import { Simulation, ForceLink } from "d3";
import AbstractNodeShellIfc from "./AbstractNodeShellIfc";
import { Constructor } from "@/core/plugin/Constructor";
import { OV_COLUMNWIDTH } from "@/core/components/overview/OverviewEngineValues";
import { doBenchmark, logTime, logTimeGivenValue } from "@/core/utils/Benchmark";

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
    STATICDYNAMICX,
    STATICDYNAMICEXT,
}

export abstract class AbstractNodeLayout {

    public readonly abstract id: LayoutType;

    public abstract nodeAdded(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract nodesRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract nodesUpdated(shell: AbstractNodeShellIfc): void;

    public abstract nodeDragged(node: AbstractNode, type: "start" | "move" | "end", offset: { x: number, y: number } | undefined, transform: { k: number }): void;

    public abstract featuresUpdated(shell: AbstractNodeShellIfc): void;

    public abstract shellUpdated(shell: AbstractNodeShellIfc): void;

    public abstract getNodePosition(n: AbstractNode): { x: number, y: number };

    public abstract tickLayout(shells: AbstractNodeShellIfc[], delta: number): void;

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

    public shellUpdated(shell: AbstractNodeShellIfc): void {
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
    public nodesRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

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

    public tickLayout(shells: AbstractNodeShellIfc[], delta: number): void {

    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: OV_COLUMNWIDTH * n.depth, y: n.getY() };
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
    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: OV_COLUMNWIDTH * n.depth, y: n.getY() };
    }

    public nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }
    public nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }
    public nodesRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }

    public id: LayoutType = LayoutType.STATIC;

    mapSimulation: Map<AbstractNodeShellIfc, Simulation<AbstractNode, AbstractLink<AbstractNode>>> = new Map();

    public shellUpdated(shell: AbstractNodeShellIfc): void {
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

    public tickLayout(shells: AbstractNodeShellIfc[], delta: number): void {
        shells.forEach(shell => {

            // this.calculateBounds(shell.root);
            // this.positionNodes(shell.root);

        })
    }

}

@LayoutDecorator()
class NodeLayoutStaticDynamic extends AbstractNodeLayout {

    public featuresUpdated(shell: AbstractNodeShellIfc): void { }

    public id: LayoutType = LayoutType.STATICDYNAMIC;

    static nodeBound: number = 200;
    static coolDownTime: number = 64; // in frames
    static minAlpha: number = 0.001; // cooldown starts when alpha in current tick is less then minAlpha
    static gravity: number = 0.00015; // gravity force vector strength to target position 
    static friction = 0.97;

    frictionNormal = NodeLayoutStaticDynamic.friction;

    public nodeDragged(node: AbstractNode, type: "start" | "move" | "end", offset: { x: number, y: number } | undefined, t: { k: number }): void {
        switch (type) {
            case "start":
                this.frictionNormal = NodeLayoutStaticDynamic.friction;
                NodeLayoutStaticDynamic.friction = 0.945;

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
        this.updateLayout(shell.root)
    }

    public nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatShell(shell);
        this.updateLayout(shell.root)
    }

    public nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void { }

    public nodesRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatShell(shell);
        this.updateLayout(shell.root)
    }

    public shellUpdated(shell: AbstractNodeShellIfc): void {
        this.reheatShell(shell);
        this.updateLayout(shell.root);
    }

    public nodeAdded(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        node.y = parent.children.length > 1 && parent.children[parent.children.length - 2].y ? parent.children[parent.children.length - 2].y : parent.y;
        this.reheatShell(shell);
        // layout update will be called later
    }

    private updateLayout(node: AbstractNode): void {
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
    public tickLayout(shells: AbstractNodeShellIfc[], delta: number): void {

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
                        // n.y = n.parent ? n.parent.getY() : n.getY();
                    }

                });

                // cooldown when minAlpha is reached or heat up till the maximum cooldowntime is reached.
                alpha < NodeLayoutStaticDynamic.minAlpha ? heat.v-- : heat.v += heat.v < NodeLayoutStaticDynamic.coolDownTime ? 1 : 0;
            }

        })


    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: OV_COLUMNWIDTH * n.depth, y: n.getY() };
    }

}

@LayoutDecorator()
class NodeLayoutStaticDynamicX extends AbstractNodeLayout {

    constructor() {
        super();
    }

    public featuresUpdated(shell: AbstractNodeShellIfc): void { }

    public id: LayoutType = LayoutType.STATICDYNAMICX;

    randomMovement = false;

    public nodeDragged(node: AbstractNode, type: "start" | "move" | "end", offset: { x: number, y: number } | undefined, t: { k: number }): void {
        switch (type) {
            case "start":

                node.fy = node.y; // Fix points
                node.fx = node.x; // Fix points
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
                            c.customData["co"].y = c.getY();
                            c.customData["co"].x = c.getX();
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
                        c.customData["co"].y = c.getY();
                        c.customData["co"].x = c.getX();
                        // c.customData["co"] = { y: c.getY(), vy: 0, x: c.getX(), vx: 0 }
                    });
                }

                node.descendants(true).forEach(c => { c.customData["co"].vy = 0, c.customData["co"].vx = 0 });
                if (node.shell) node.shell.nodes.forEach(n => { n.fy = undefined; n.fx = undefined });

                this.nodesUpdated(node.shell as any);
                node.descendants(false).forEach(c => delete c.customData["initDrag"]);

                break;
            default:
                break;
        }
    }

    public nodesUpdated(shell: AbstractNodeShellIfc): void {
        this.reheatShell(shell);
        this.updateLayout(shell.root)
    }

    public nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatShell(shell);
        this.updateLayout(shell.root)
    }

    public nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void { }

    public nodesRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.reheatShell(shell);
        this.updateLayout(shell.root)
    }

    public shellUpdated(shell: AbstractNodeShellIfc): void {
        this.reheatShell(shell);
        this.updateLayout(shell.root);
    }

    public nodeAdded(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        node.y = parent.y;
        node.x = parent.x;
        this.reheatShell(shell);
        // layout update will be called later
    }

    mapColumnBounds: Map<number, number> = new Map();
    // depth, x
    mapBounds: Map<number, number> = new Map();

    private updateLayout(node: AbstractNode): void {
        this.mapColumnBounds.clear();
        this.mapBounds.clear();
        this.calculateBounds(node);
        this.mapColumnBounds = new Map([...this.mapColumnBounds.entries()].sort());

        /**
         * Based on the largest bound in each column, calculate the width of the column 
         * by making sure the maximum angle is not exceeded
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
            n.customData["b"] = NodeLayoutStaticDynamicX.nodeBound;
        }

        const maxBound = this.mapColumnBounds.get(n.depth);
        if (!maxBound || maxBound < n.customData["b"]) this.mapColumnBounds.set(n.depth, n.customData["b"]);

    }

    positionNodes(n: AbstractNode): void {

        if (n.isRoot()) n.y = 0;

        let childBound = n.children.length > 0 ? n.children.map(c => c.customData["b"] as number).reduce((p, n) => p + n) : NodeLayoutStaticDynamic.nodeBound;

        let coord = n.customData["co"] == undefined ? n.customData["co"] = { y: n.getY(), vy: 0, x: n.getX(), vx: 0 } : n.customData["co"];

        let yStart = (coord ? coord.y : n.getY()) - ((childBound) / 2);

        n.children.forEach((c, i) => c.customData["i"] == undefined ? c.customData["i"] = i : "");
        n.children.sort((a, b) => (a.customData["i"] == undefined ? 0 : a.customData["i"]) - (b.customData["i"] == undefined ? 0 : b.customData["i"]))

        for (let i = 0; i < n.children.length; i++) {
            const c = n.children[i];

            const newY = yStart + (c.customData["b"] / 2);
            const xC = this.mapBounds.get(c.depth);

            let coordChild = c.customData["co"] == undefined ? c.customData["co"] = { y: newY, vy: 0, x: xC ? xC : 0, vx: 0 } : c.customData["co"];
            coordChild.y = newY;
            coordChild.x = xC ? xC : 0;

            yStart += c.customData["b"] as number;
        }

        for (let i = 0; i < n.children.length; i++)  this.positionNodes(n.children[i]);

    }

    public reheatShell(shell: AbstractNodeShellIfc) { shell.customData["heat"] = { v: NodeLayoutStaticDynamicX.coolDownTime }; };

    static maxAngle = 60;
    static maxAngleTan = Math.tan(NodeLayoutStaticDynamicX.maxAngle * (Math.PI / 180));
    static nodeBound: number = 200;
    static coolDownTime: number = 256; // in frames
    static minAlpha: number = 0.0003; // cooldown starts when alpha in current tick is less then minAlpha

    static ColumnWidthMin = 2100;

    static stiffnessX: number = .0005; // gravity force vector strength to target position 
    static dampingX = .003;

    static stiffnessY: number = .0003; // gravity force vector strength to target position 
    static dampingY = .0025;

    static randomness = 0.4;

    /**
     * 
     * @param shells 
     * @param delta ms since last frame, about 5-40 (ms)
     */
    public tickLayout(shells: AbstractNodeShellIfc[], delta: number): void {

        if (doBenchmark && shells.length > 0) logTime("sim");

        shells.forEach(shell => {

            let heat: { v: number } = shell.customData["heat"];
            if (heat == undefined) heat = shell.customData["heat"] = { v: NodeLayoutStaticDynamicX.coolDownTime };

            if (heat.v > 0) {
                let alpha = 0;
                shell.nodes.forEach(n => {
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

                        function explicitEuler(pos: "x" | "y", stiffness = NodeLayoutStaticDynamicX.stiffnessY, damping = NodeLayoutStaticDynamicX.dampingY, vel = "v" + pos) {
                            let dist = coord[pos] - n[pos];
                            const acc = (stiffness * dist - damping * coord[vel]) * delta;
                            // add random force for a more "natural" movement
                            coord[vel] += random(acc);
                            if (n.fy == undefined) n[pos] += coord[vel];
                            alpha = Math.max(alpha, Math.abs(coord[vel]));
                        }

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
                            alpha = Math.max(alpha, Math.abs(coord[vel]));

                        }

                    }

                });

                const heatold = heat.v;
                // cooldown when minAlpha is reached or heat up till the maximum cooldowntime is reached.
                alpha < NodeLayoutStaticDynamic.minAlpha ? heat.v-- : heat.v += heat.v < NodeLayoutStaticDynamic.coolDownTime ? 1 : 0;
                if (doBenchmark) logTimeGivenValue("velocity", alpha);
                // set velocity to 0 if we hit zero movement
                if (heat.v == 0 && heatold == 1) (doBenchmark) ? console.log("Simulation freezed") : 0, shell.nodes.forEach(n => {
                    const coord = n.customData["co"];
                    if (coord) coord.vx = 0, coord.vy = 0;
                });
            }

        });

        if (doBenchmark && shells.length > 0) logTime("sim");

    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: n.getX(), y: n.getY() };
    }

}

class LayouterClass {

    static instance: LayouterClass = new LayouterClass();

    activeId: LayoutType = LayoutType.STATICDYNAMICX;

    private constructor() { }

    getLayout(): AbstractNodeLayout {
        let layout = Layouts.find(l => l.id == this.activeId);
        layout == undefined ? this.activeId = Layouts[0].id : "";
        layout == undefined ? layout = Layouts[0] : "";
        return layout;
    }


}

export const Layouter = LayouterClass.instance.getLayout();