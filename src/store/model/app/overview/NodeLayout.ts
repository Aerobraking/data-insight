import { Constructor } from "@/components/app/plugins/Constructor";
import { AbstractLink, AbstractNode } from "./AbstractNode";
import * as d3 from "d3";
import { Simulation, ForceLink, Quadtree } from "d3";
import CollideExtend from "@/utils/CollideExtend";
import AbstractNodeShellIfc from "./AbstractNodeShellIfc";
import { Numeric_0 } from "mdue";

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
}

export abstract class AbstractNodeLayout {

    public readonly abstract id: LayoutType;

    public abstract nodeAdded(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    public abstract nodesUpdated(shell: AbstractNodeShellIfc): void;

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
        shells.forEach(shell => {
            let simulation = this.mapSimulation.get(shell);
            if (!simulation) {
                simulation = d3
                    .forceSimulation([] as Array<AbstractNode>)
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

                this.shellContentUpdate(shell);

                this.mapSimulation.set(shell, simulation);
            }




            simulation.alpha(1);
            // simulation.tick();
        })
    }

}

@LayoutDecorator()
class NodeLayoutStatic extends AbstractNodeLayout {
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

    static nodeBound: number = 260;

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

    public id: LayoutType = LayoutType.STATICDYNAMIC;

    public nodesUpdated(shell: AbstractNodeShellIfc): void {
        this.update(shell.root)
    }

    public nodeRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.update(shell.root)
    }

    public nodeUpdated(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

    }

    public nodeChildrenRemoved(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.update(shell.root)
    }

    public shellContentUpdate(shell: AbstractNodeShellIfc): void {

    }

    static nodeBound: number = 100;

    public nodeAdded(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {
        this.update(shell.root)
    }

    private update(node: AbstractNode): void {
        this.calculateBounds(node);
        this.positionNodes(node);
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

        let coord = n.customData["co"] == undefined ? n.customData["co"] = { y: n.getY(), vy: 0 } : n.customData["co"];

        let yStart = (coord ? coord.y : n.getY()) - (childBound / 2);

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

    /**
     * 
     * @param shells 
     * @param delta ms since last frame, about 5-40 (ms)
     */
    public tick(shells: AbstractNodeShellIfc[], delta: number): void {

        shells.forEach(shell => {

            shell.nodes.forEach(n => {

                const coord = n.customData["co"];

                if (coord != undefined) {
                    const dist = coord.y - n.y;
                    const abs = Math.abs(dist);
                    if (abs > 0 && abs < 5) n.y = coord.y;
                    else if (abs >= 5) {
                        coord.vy += (dist) * delta * 0.0005;
                        if (n.fy == undefined) n.y += coord.vy *= 0.7;
                    }
                } else {
                    n.y = n.parent ? n.parent.getY() : n.getY();
                }

            });

        })
    }

    public getNodePosition(n: AbstractNode): { x: number, y: number } {
        return { x: n.getX(), y: n.getY() };
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