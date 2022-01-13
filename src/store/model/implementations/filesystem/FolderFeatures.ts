import { fileamountFormat, filesizeFormat, timeFormat } from "@/utils/format";
import { FeatureDataSum, Feature, FeatureDataMedian } from "../../app/overview/AbstractNodeFeature";
import { AbstractNodeFeatureGradient, FeatureGradientSettings, FeatureViewDecorator } from "../../app/overview/AbstractNodeFeatureView";
import { AbstractNodeShell } from "../../app/overview/AbstractNodeShell";

import FolderNode from "./FolderNode";

@FeatureViewDecorator()
export class NodeFeatureSize extends AbstractNodeFeatureGradient<FolderNode, FeatureDataSum> {
    public formatter: (value: number) => string = filesizeFormat;
    public margin: number = 1024 * 1024 * 8;

    public getNewSettingsInstance(): FeatureGradientSettings {
        return new FeatureGradientSettings(10, 1024 * 1024 * 1024 * 16);
    }

    public getNewDataInstance(): FeatureDataSum {
        return new FeatureDataSum();
    }

    readonly id: Feature = Feature.FolderSize;
    readonly min: number = 0;
    readonly max: number = 1024 * 1024 * 1024 * 1024;
    public readonly readableName: string = "Folder Size";

    constructor() {
        super({
            min: 0, // kb
            20: 1024 * 1024 * 32, // mb
            40: 1024 * 1024 * 256, // mb
            60: 1024 * 1024 * 1024, // gb
            80: 1024 * 1024 * 1024 * 16, // gb
            max: 1024 * 1024 * 1024 * 512, // tb
        });
    }


    public getNodeRadius(node: FolderNode, entry: AbstractNodeShell<FolderNode>): number {
        return 0;
    }

    getGradientValue(node: FolderNode): number {
        const data = node.getFeatureValue(Feature.FolderSize);
        return data ? data.s : 0;
    }

    public getFeatureText(nodes: FolderNode, entry: AbstractNodeShell<FolderNode>): string {
        const data = nodes.getFeatureValue(Feature.FolderSize);
        return (data ? filesizeFormat(data.s) : "- MB");
    }
}

@FeatureViewDecorator()
export class NodeFeatureLastModifiy extends AbstractNodeFeatureGradient<FolderNode, FeatureDataMedian> {
    public formatter: (value: number) => string = timeFormat;
    public margin: number = 60 * 10;

    public getNewSettingsInstance(): FeatureGradientSettings {
        return new FeatureGradientSettings(0, 60 * 60 * 24 * 365);
    }

    public getNewDataInstance(): FeatureDataMedian {
        return new FeatureDataMedian();
    }

    readonly id: Feature = Feature.FolderLastModify;
    readonly min: number = 0;
    readonly max: number = 1024 * 1024 * 1024 * 1024;
    public readonly readableName: string = "Last Modified";

    constructor() {
        super({
            min: 0, // kb
            20: 60 * 60, // 1 Stunde
            40: 60 * 60 * 24, // 1 Tag
            60: 60 * 60 * 24 * 30, // 1 Monat
            80: 60 * 60 * 24 * 365, // 1 Jahr
            max: 60 * 60 * 24 * 365 * 10, // 10 Jahre
        });
    }
 
    public getNodeRadius(node: FolderNode, entry: AbstractNodeShell<FolderNode>): number {
        return 0;
    }

    getGradientValue(node: FolderNode): number | undefined {
        const data = node.getFeatureValue(Feature.FolderLastModify);
        return data && data.m && data.m > 0 ? (new Date().getTime() / 1000) - data.m : undefined;
    }

    public getFeatureText(nodes: FolderNode, entry: AbstractNodeShell<FolderNode>): string {
        const data = nodes.getFeatureValue(Feature.FolderLastModify);
        const value = data && data.m && data.m > 0 ? (Math.floor(new Date().getTime() / 1000)) - data.m : undefined;
        return value ? timeFormat(value) /*+ ": " + (data && data.m ? data.m + " | " + data.m?.toString().length + " | " + ((Math.floor(new Date().getTime() / 1000)) - data.m) : "") */ : "No Value";
    }
}

/**
 * Dieses Feature wird von Folder Nodes benutzt. Es nutzt einen Gradienten als view, dessen min und max werte hier enthalten sind.
 */
@FeatureViewDecorator()
export class NodeFeatureQuantity extends AbstractNodeFeatureGradient<FolderNode, FeatureDataSum> {

    public formatter: (value: number) => string = fileamountFormat;
    public margin: number = 10;

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

    public getFeatureText(nodes: FolderNode, entry: AbstractNodeShell<FolderNode>): string {
        const data = nodes.getFeatureValue(Feature.FolderQuantity);

        return (data ? fileamountFormat(data.s) : "0 Files");
    }

    public getNewDataInstance(): FeatureDataSum {
        return new FeatureDataSum();
    }

    public getNodeRadius(node: FolderNode, entry: AbstractNodeShell<FolderNode>): number {
        return 0;
    }
    public readonly readableName: string = "File Amount";

    getGradientValue(node: FolderNode): number {
        const data = node.getFeatureValue(Feature.FolderQuantity);
        return data ? data.s : 0;
    }

    readonly id: Feature = Feature.FolderQuantity;
    readonly min: number = 0;
    readonly max: number = 1000;

}
