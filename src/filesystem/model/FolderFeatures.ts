import { fileamountFormat, filesizeFormat, timeFormat } from "@/filesystem/utils/FileStringFormatter";
import { FeatureDataSum, FeatureDataMedian } from "../../core/model/workspace/overview/FeatureData";
import { AbstractFeatureGradient, FeatureGradientSettings, FeatureViewDecorator } from "../../core/model/workspace/overview/AbstractFeature";
import { AbstractNodeTree } from "../../core/model/workspace/overview/AbstractNodeTree";

import FolderNode from "./FolderNode";
import { FeatureType } from "@/core/model/workspace/overview/FeatureType";

@FeatureViewDecorator()
export class NodeFeatureSize extends AbstractFeatureGradient<FolderNode, FeatureDataSum> {
    public formatter: (value: number) => string = filesizeFormat;
    public margin: number = 1024 * 1024 * 1;

    public getNewSettingsInstance(): FeatureGradientSettings {
        return new FeatureGradientSettings(10, 1024 * 1024 * 1024 * 16);
    }

    public getNewDataInstance(): FeatureDataSum {
        return new FeatureDataSum();
    }

    readonly id: FeatureType = FeatureType.FolderSize;
    readonly min: number = 0;
    readonly max: number = 1024 * 1024 * 1024 * 1024;
    public readonly readableName: string = "Folder Size";

    constructor() {
        super({
            min: 0,                         // 0 MB
            20: 1024 * 1024 * 32,           // 32 MB
            40: 1024 * 1024 * 256,          // 256 MB
            60: 1024 * 1024 * 1024,         // 1 GB
            80: 1024 * 1024 * 1024 * 16,    // 16 GB
            max: 1024 * 1024 * 1024 * 512,  // 512 GB
        });
    }

    /**
     * We use the Folder Size
     * @param node 
     * @param entry 
     * @returns 
     */
    public getNodeRadius(node: FolderNode, entry: AbstractNodeTree<FolderNode>): number {
        if (node.isRoot()) {
            return 100;
        } else {
            let abs = entry.root.getFeatureValue(FeatureType.FolderSize);
            let part = node.getFeatureValue(FeatureType.FolderSize);
            if (abs != undefined && part != undefined) {
                let r = abs.s > 0 ? Math.sqrt(31415 * (part.s / abs.s) / Math.PI) : 1;
                r = 100 * 0.1 + r * 0.9;
                return Math.max(r, 16);
            }
        }
        return 16;
    }

    getGradientValue(node: FolderNode): number | undefined {
        const data = node.getFeatureValue(FeatureType.FolderSize);
        return data ? data.s : undefined;
    }

    public getFeatureText(nodes: FolderNode, entry: AbstractNodeTree<FolderNode>): string {
        const data = nodes.getFeatureValue(FeatureType.FolderSize);
        return (data ? filesizeFormat(data.s) : "- MB");
    }

}

@FeatureViewDecorator()
export class NodeFeatureLastModifiy extends AbstractFeatureGradient<FolderNode, FeatureDataMedian> {
    public formatter: (value: number) => string = timeFormat;
    public margin: number = 60;

    public getNewSettingsInstance(): FeatureGradientSettings {
        return new FeatureGradientSettings(0, 60 * 60 * 24 * 365);
    }

    public getNewDataInstance(): FeatureDataMedian {
        return new FeatureDataMedian();
    }

    readonly id: FeatureType = FeatureType.FolderLastModify;
    readonly min: number = 0;
    readonly max: number = 1024 * 1024 * 1024 * 1024;
    public readonly readableName: string = "Last Modified";

    constructor() {
        super({
            min: 0,
            20: 60 * 60, // 1 Hours
            40: 60 * 60 * 24, // 1 Day
            60: 60 * 60 * 24 * 30, // 1 Month
            80: 60 * 60 * 24 * 365, // 1 Year
            max: 60 * 60 * 24 * 365 * 10, // 10 Years
        });

        this.gradients.forEach(g => g.reverse = !g.reverse);
    }

    /**
     * We use the Folder Size for determining the node radius. The area of the circle is relative
     * to the Folder Size of the root node, which has a radius of 100.
     * @param node 
     * @param entry 
     * @returns 
     */
    public getNodeRadius(node: FolderNode, entry: AbstractNodeTree<FolderNode>): number {
        if (node.isRoot()) {
            return 100;
        } else {
            let abs = entry.root.getFeatureValue(FeatureType.FolderSize);
            let part = node.getFeatureValue(FeatureType.FolderSize);
            if (abs != undefined && part != undefined) {
                let r = abs.s > 0 ? Math.sqrt(31415 * (part.s / abs.s) / Math.PI) : 1;
                r = 100 * 0.1 + r * 0.9;
                return Math.max(r, 16);
            }
        }
        return 16;
    }

    getGradientValue(node: FolderNode): number | undefined {
        const data = node.getFeatureValue(FeatureType.FolderLastModify);
        return data && data.m && data.m > 0 ? (new Date().getTime() / 1000) - data.m : undefined;
    }

    public getFeatureText(nodes: FolderNode, entry: AbstractNodeTree<FolderNode>): string {
        const data = nodes.getFeatureValue(FeatureType.FolderLastModify);
        const value = data && data.m && data.m > 0 ? (Math.floor(new Date().getTime() / 1000)) - data.m : undefined;
        return value ? timeFormat(value) : "No Value";
    }
}

/**
 * Dieses Feature wird von Folder Nodes benutzt. Es nutzt einen Gradienten als view, dessen min und max werte hier enthalten sind.
 */
@FeatureViewDecorator()
export class NodeFeatureQuantity extends AbstractFeatureGradient<FolderNode, FeatureDataSum> {

    public formatter: (value: number) => string = fileamountFormat;
    public margin: number = 3;

    constructor() {
        super({
            min: 0,
            25: 100,
            max: 250000,
        });
    }

    public getNewSettingsInstance(): FeatureGradientSettings {
        return new FeatureGradientSettings(0, 50000);
    }

    public getFeatureText(nodes: FolderNode, entry: AbstractNodeTree<FolderNode>): string {
        const data = nodes.getFeatureValue(FeatureType.FolderQuantity);

        return (data ? fileamountFormat(data.s) : "0 Files");
    }

    public getNewDataInstance(): FeatureDataSum {
        return new FeatureDataSum();
    }

    /**
     * We use the Folder Size for determining the node radius. The area of the circle is relative
     * to the Folder Size of the root node, which has a radius of 100.
     * @param node 
     * @param entry 
     * @returns 
     */
    public getNodeRadius(node: FolderNode, entry: AbstractNodeTree<FolderNode>): number {
        if (node.isRoot()) {
            return 100;
        } else {
            let abs = entry.root.getFeatureValue(FeatureType.FolderSize);
            let part = node.getFeatureValue(FeatureType.FolderSize);
            if (abs != undefined && part != undefined) {
                let r = abs.s > 0 ? Math.sqrt(31415 * (part.s / abs.s) / Math.PI) : 1;
                r = 100 * 0.1 + r * 0.9;
                return Math.max(r, 16);
            }
        }
        return 16;
    }

    public readonly readableName: string = "File Amount";

    getGradientValue(node: FolderNode): number {
        const data = node.getFeatureValue(FeatureType.FolderQuantity);
        return data ? data.s : 0;
    }

    readonly id: FeatureType = FeatureType.FolderQuantity;
    readonly min: number = 0;
    readonly max: number = 1000;

}
