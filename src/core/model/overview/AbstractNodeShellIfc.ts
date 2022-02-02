import { Quadtree } from "d3";

export default interface AbstractNodeShellIfc {
    nodeUpdate(node: any): void;
    nodeChildrenRemoved(node: any): void;
    nodeRemoved(node: any): void;
    quadtree: Quadtree<any> | undefined;
    path: string;
    root: any;
    nodes: any[];
    links: any[];
    x: number;
    y: number;
    id: number;
    customData: { [any: string]: any };
    isSimulationActive: boolean;
    nodeAdded(node: any): void;
    loadCollection(node: any): void;
}