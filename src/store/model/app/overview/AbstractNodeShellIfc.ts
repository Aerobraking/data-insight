export default interface AbstractNodeShellIfc {
    nodeUpdate(): void;
    nodeRemoved(): void;
    path: string;
    root: any;
    simulation: any;
    id: number;
     isSimulationActive: boolean;
    nodeAdded(node: any): void;  
    loadCollection(node: any): void;
}