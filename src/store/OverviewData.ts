import { GraphData, NodeObject, LinkObject } from "force-graph";


export class OverviewNode implements NodeObject {
    isDirectory: boolean = false;
    name: string = "";
    path: string = "";
    color: string = "";
    hue: number = 0;
    children: Array<OverviewNode> = [];
    parent: OverviewNode | undefined;
    x?: number;
    y?: number;
    depth: number = 0;
    radius: number = 0;
    size: number = 10;
    id: string | number;
    vx?: number | undefined;
    vy?: number | undefined;
    fx?: number | undefined;
    fy?: number | undefined;

    getX(): number {
        return this.x ? this.x : 0;
    }
    getY(): number {
        return this.y ? this.y : 0;
    }

    constructor(id: string | number) {
        this.id = id;
    }

    public getHSL(): string {

        return this.depth == 0
            ? `hsl(0, 100%, 100%)`
            : `hsl(${this.hue}, ${65 - (this.isDirectory ? 0 : 55)}%, ${70 - this.depth * 3}%)`;
    }

    public depthCalc(): number {
        this.depth = 0;
        if (this.parent != undefined) {
            let p: OverviewNode = this;
            while (p.parent != undefined) {
                this.depth = this.depth + 1;
                p = p.parent;
            }
        }
        return this.depth;
    }

}

export class OverviewLink implements LinkObject {
    source?: string | number | OverviewNode;
    target?: string | number | OverviewNode;
}

export class OverviewData implements GraphData {
    nodes: OverviewNode[] = [];
    links: OverviewLink[] = [];
}

