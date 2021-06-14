import { GraphData, NodeObject, LinkObject } from "force-graph";


export class OverviewNode implements NodeObject {
    isDirectory: boolean = false;
    name: string = "";
    path: string = "";
    children: Array<OverviewNode> = [];
    x: number = 0;
    y: number = 0;
    radius: number = 0;
    size: number = 10;
    id: string | number;
    vx?: number | undefined;
    vy?: number | undefined;
    fx?: number | undefined;
    fy?: number | undefined;

    constructor(id: string | number) {
        this.id = id;
    }
}

export class OverviewLink implements LinkObject {
    source?: string | number | OverviewNode;
    target?: string | number | OverviewNode;
}

export class OverviewData implements GraphData{
    nodes: OverviewNode[] = [];
    links: OverviewLink[] = [];
}

