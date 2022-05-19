import { Quadtree } from "d3";

/**
 * The AbstractNode class has a reference to its tree but it can not use the
 * AbstractNodeTree class for that because that would lead to a circle dependency.
 * So it used this interface which offers all properties of the AbstractNodeTree
 * that the AbstractNode needs.
 * 
 * See the AbstractNodeTree documentation for the details of these methods and properties. 
 */
export default interface AbstractNodeTreeIfc {
    nodeUpdate(node: any): void;
    nodesRemoved(node: any): void;
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
    nodeAdded(node: any): void;
    loadCollection(node: any, useSavedDepth: boolean): void;
}