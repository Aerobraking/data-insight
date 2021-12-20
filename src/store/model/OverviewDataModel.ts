import { NodeObject, LinkObject } from "force-graph";
import * as _ from "underscore";
import { FolderOverviewEntry } from "@/components/workspace/overview/FileEngine";
import { AbstractOverviewEntry } from "@/components/workspace/overview/OverviewData";
import { Type } from "class-transformer";

export class Overview {

    constructor() {
        this.id = Math.floor(Math.random() * 1000000000000);
    }

    id: number;
    viewportTransform: { x: number, y: number, scale: number } = { x: 0, y: 0, scale: 0.25 }
    gradientId: string = "";

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

    public initAfterLoading() {
        for (let i = 0; i < this.rootNodes.length; i++) {
            const v = this.rootNodes[i];
            v.initAfterLoading();
        }
    }

}