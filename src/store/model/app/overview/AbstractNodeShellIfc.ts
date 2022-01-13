export default interface AbstractNodeShellIfc {
    nodeUpdate(): void;
    nodeRemoved(): void;
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