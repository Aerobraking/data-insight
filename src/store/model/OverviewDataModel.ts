import { GraphData, NodeObject, LinkObject } from "force-graph";

import { View } from "./DataModel";
import * as _ from "underscore";
import { FolderOverviewEntry } from "@/components/workspace/overview/FileEngine";
import { AbstractOverviewEntry } from "@/components/workspace/overview/OverviewData";
import { Type } from "class-transformer";

export class Overview {

    constructor() {
        this.id = Math.floor(Math.random() * 1000000000000);
    }

    id: number;
    viewportTransform: { x: number, y: number, scale: number } = { x: 0, y: 0, scale: 0.333 }


    @Type(() => AbstractOverviewEntry, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'nodetype',
            subTypes: [
                { value: FolderOverviewEntry, name: 'folder' }
            ],
        },
    })    
    rootNodes: FolderOverviewEntry[] = [];
}

enum BackgroundBehaviour {
    NORMAL,
    SLOWDOWN,
    PAUSE,
}

export abstract class OverviewRenderSettings {
    nodeSizeRelFacotor: number = 1;
    showLeafs: boolean = true;
    backgroundBehaviour: BackgroundBehaviour = BackgroundBehaviour.NORMAL;
}


/**
 * 
 * 
 * What do we need:
 * 
 * Extend Overview for your implementation of an Overview. 
 * 
 * Create a Vue component for your overview Subclass. 
 * 
 * 
 * 
 */

export abstract class TreeStructureHandler<T, N extends AbstractNode<T>> {
    abstract name: string;
    /**
     * Is called to sync the current existing tree structure in our model
     * with the actual one from our source. That is typically called when 
     * starting the program. After the sync, the synchronisation is done
     * through the watching of changed in the source.
     */
    abstract syncStructure(): void;

    abstract startWatcher(): void;

    abstract reactToDrop(e: DragEvent): void;

}



/**
 * Handles the Rendering of the Overview Graph
 */
export interface OverviewRendererInterface<T, N extends AbstractNode<T>> {
    getNodeHSLString(node: N): string;

    renderNodes(listNodes: Array<N>): void;
    renderLinks(listLinks: Array<OverviewLink<T>>, listNodes: Array<N>,): void;
}
/**
 * The super class for any nodes you want to display in the Overview.
 */
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

    parents(): Array<this> {
        let a: Array<this> = [];
        let p = this;
        while (p.getParent() != undefined) {
            a.push(p.getParent() as this);
            p = p.getParent() as this;
        }
        return a;
    }

    private collectNodes(node: AbstractNode<T>, a: Array<AbstractNode<T>>): void {

        if (node.isDirectory()) {
            a.push(node);
        }

        for (let i = 0; i < node.children.length; i++) {
            let c: AbstractNode<T> = node.children[i];
            this.collectNodes(c, a);
        }
    }

    private collectLinks(node: AbstractNode<T>, a: Array<OverviewLink<T>>): void {
        for (let i = 0; i < node.children.length; i++) {
            let c: AbstractNode<T> = node.children[i];
            if (c.isDirectory()) {
                a.push({ source: node, target: c });
            }
            this.collectLinks(c, a);
        }
    }
    public getHSL(alpha: number = 1, ligthness: number = 1): string {
        let l = ligthness > 1 ? 95 : (99 - this.depth * 10);
        return this.depth == 0
            ? `hsl(0, 100%, 100%)`
            : `hsla(${0}, ${0}%, ${Math.max(5, l)}%, ${alpha})`;
        // return this.depth == 0
        //     ? `hsl(0, 100%, 100%)`
        //     : `hsl(${this.hue}, ${65 - (this.isDirectory() ? 0 : 55)}%, ${70 - this.depth * 3}%)`;
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


/**
 * Defines the Link between two AbstractNode instances. Extend it to use it with your AbstractNode subclass.
 */
export abstract class OverviewLink<T> implements LinkObject {
    constructor(source: AbstractNode<T>, target: AbstractNode<T>) {
        this.source = source;
        this.target = target;
    }

    source: AbstractNode<T>;
    target: AbstractNode<T>;
}


