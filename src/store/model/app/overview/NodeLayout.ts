import { Constructor } from "@/components/app/plugins/Constructor";
import { AbstractLink, AbstractNode } from "./AbstractNode";
import * as d3 from "d3";
import { Simulation, ForceLink, Quadtree } from "d3";
import CollideExtend from "@/utils/CollideExtend";
import AbstractNodeShellIfc from "./AbstractNodeShellIfc";

export const Layouts: AbstractNodeLayout[] = [];
export function LayoutDecorator() {
    return function <T extends Constructor<AbstractNodeLayout>>(target: T) {
        Layouts.push(new target());
    };
}

export enum LayoutType {
    DEFAULT,
    STATIC,
}

export abstract class AbstractNodeLayout {

    public readonly abstract id: LayoutType;
    public abstract addNode(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void;

    // public abstract shellAdded(shell:AbstractNodeShell):void;
    // public abstract shellRemoved(shell:AbstractNodeShell):void;

    public abstract tick(shells: AbstractNodeShellIfc[]): void;
    public abstract shellContentUpdate(shell: AbstractNodeShellIfc): void;

}

@LayoutDecorator()
class NodeLayoutDefault extends AbstractNodeLayout {

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

    public addNode(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

        let nodes: AbstractNode[] = shell.nodes;

        const listNodes = nodes.filter(n => n.getDepth() == parent.getDepth() + 1);

        listNodes.sort((a, b) => a.getY() - b.getY());

        let bottom = listNodes.length ? listNodes[listNodes.length - 1] : undefined;
        let BottomFromList = bottom ? bottom.getY() + 150 : parent.getY();
        let yfromParent = parent.getY();


        node.y = Math.max(yfromParent, BottomFromList);

    }

    public tick(shells: AbstractNodeShellIfc[]): void {
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

    public id: LayoutType = LayoutType.STATIC;

    mapSimulation: Map<AbstractNodeShellIfc, Simulation<AbstractNode, AbstractLink<AbstractNode>>> = new Map();

    public shellContentUpdate(shell: AbstractNodeShellIfc): void {
        let simulation = this.mapSimulation.get(shell);
        if (simulation) {

            let f: ForceLink<AbstractNode, AbstractLink<AbstractNode>> | undefined = simulation.force<ForceLink<AbstractNode, AbstractLink<AbstractNode>>>('link');

            if (f) f.links(shell.links);
            simulation.nodes(shell.nodes);
        }
    }
   

    public addNode(shell: AbstractNodeShellIfc, parent: AbstractNode, node: AbstractNode): void {

        let nodes: AbstractNode[] = shell.nodes;

        const listNodes = nodes.filter(n => n.getDepth() == parent.getDepth() + 1);

        listNodes.sort((a, b) => a.getY() - b.getY());

        let bottom = listNodes.length ? listNodes[listNodes.length - 1] : undefined;
        let BottomFromList = bottom ? bottom.getY() + 450 : parent.getY();
        let yfromParent = parent.getY();


        node.y = Math.max(yfromParent, BottomFromList);

    }

    public tick(shells: AbstractNodeShellIfc[]): void {
        shells.forEach(shell => {
            let simulation = this.mapSimulation.get(shell);
            if (!simulation) {

            }


        })
    }

}

class LayouterClass {

    static instance: LayouterClass = new LayouterClass();

    private constructor() {

    }
    activeId: LayoutType = LayoutType.DEFAULT;
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
        this.getLayout().addNode(shell, parent, node);
    }


    tick(shells: AbstractNodeShellIfc[]): void {
        this.getLayout().tick(shells);
    }
}

export const Layouter = LayouterClass.instance;