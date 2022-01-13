export default interface AbstractNodeShellIfc {
    nodeUpdate(): void;
    nodeRemoved(): void;
    path: string;
    root: any;
    x: number;
    y: number;
    simulation: any;
    id: number;
    isSimulationActive: boolean;
    nodeAdded(node: any): void;
    loadCollection(node: any): void;
}