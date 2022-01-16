export default interface AbstractNodeShellIfc {
    nodeUpdate(node:any): void;
    nodeChildrenRemoved(node:any): void;
    nodeRemoved(node: any): void;
    path: string;
    root: any;
    nodes: any[];
    links: any[];
    x: number;
    y: number; 
    id: number;
    isSimulationActive: boolean;
    nodeAdded(node: any): void;
    loadCollection(node: any): void;
}