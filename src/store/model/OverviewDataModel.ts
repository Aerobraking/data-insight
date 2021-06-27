import { GraphData, NodeObject, LinkObject } from "force-graph";

export abstract class TreeStructureHandler<T, N extends AbstractNode<T>> {
    abstract name: string;
    /**
     * Is called to sync the current existing tree structure in our model with the actual one from our source. That is typically called when starting the program. After the sync, the synchronisation is done through the watching of changed in the source.
     */
    abstract syncStructure(): void;

    abstract startWatcher(): void;

    abstract getImageForNode(node: N): void;

    abstract rootAdded(path: string): void;

}


export abstract class OverviewRenderSettings {
    nodeSizeRelFacotor: number = 1;
    showLeafs: boolean = true;
}


export abstract class OverviewLink<T> implements LinkObject {
    constructor(source: AbstractNode<T>, target: AbstractNode<T>) {
        this.source = source;
        this.target = target;
    }
    source: AbstractNode<T>;
    target: AbstractNode<T>;
}


/**
 * Handles the Rendering of the Overview Graph
 */
export interface OverviewRendererInterface<T, N extends AbstractNode<T>> {
    getNodeHSLString(node: N): string;

    renderNode(node: N, listNodes: Array<N>): void;
    renderLink(source: N, target: N, listNodes: Array<N>, listLinks: Array<OverviewLink<T>>): void;
}

export abstract class AbstractNode<T> implements NodeObject {

    children: Array<AbstractNode<T>> = [];
    parent: AbstractNode<T> | undefined;
    depth: number = 0;
    radius: number = 0;
    size: number = 10;
    id?: string | number;
    x?: number;
    y?: number;
    vx?: number | undefined;
    vy?: number | undefined;
    fx?: number | undefined;
    fy?: number | undefined;
    hue?: number;
    abstract getName(): string;
    abstract getPath(): string;
    abstract isDirectory(): boolean;
    abstract setIsDirectory(value: boolean): void;

    getParent(): AbstractNode<T> | undefined {
        return this.parent != undefined ? this.parent : undefined;
    }

    getX(): number {
        return this.x ? this.x : 0;
    }
    getY(): number {
        return this.y ? this.y : 0;
    }


    isRoot(): boolean {
        return this.parent === undefined;
    };

    descendants(): Array<this> {
        let a: Array<this> = [];
        this.collectNodes(this, a);
        return a;
    }

    private collectNodes(node: AbstractNode<T>, a: Array<AbstractNode<T>>): void {
        a.push(node);
        for (let i = 0; i < node.children.length; i++) {
            let c: AbstractNode<T> = node.children[i];
            a.push(c);
            this.collectNodes(c, a);
        }
    }

    private collectLinks(node: AbstractNode<T>, a: Array<OverviewLink<T>>): void {
        for (let i = 0; i < node.children.length; i++) {
            let c: AbstractNode<T> = node.children[i];
            a.push({ source: node, target: c });
            this.collectLinks(c, a);
        }
    }
    public getHSL(): string {

        return this.depth == 0
            ? `hsl(0, 100%, 100%)`
            : `hsl(${this.hue}, ${65 - (this.isDirectory() ? 0 : 55)}%, ${70 - this.depth * 3}%)`;
    }

    public depthCalc(): number {
        this.depth = 0;
        if (this.parent != undefined) {
            let p: AbstractNode<T> = this;
            while (p.parent != undefined) {
                this.depth = this.depth + 1;
                p = p.parent;
            }
        }
        return this.depth;
    }
    /**
     * Returns an array of links for this node, where each link is an object that defines source and target properties.
     * The source of each link is the parent node, and the target is a child node.
     * @returns 
     */
    links(): Array<OverviewLink<T>> {
        let a: Array<OverviewLink<T>> = [];
        this.collectLinks(this, a);
        return a;
    }

    getChildCount(): number {
        return this.children.length;
    }


}


export abstract class AbstractNodeDir<T> extends AbstractNode<T> {
}