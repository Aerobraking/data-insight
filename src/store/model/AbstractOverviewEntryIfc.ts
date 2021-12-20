export default interface AbstractOverviewEntryIfc {

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


/*


AbstractOverviewEntry   ->  AbstractOverviewEntryIfc
                        ->  FileEngine   !!!!!  FolderNode
                        ->  OverviewData

FileEngine              ->  AbstractOverviewEntry !!!!  AbstractOverviewEntry
                        ->  OverviewData

FolderNode              ->  OverviewData

OverviewData


F -> A
A -> F



*/