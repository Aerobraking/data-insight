import { filesizeFormat } from "@/utils/format";
import { FeatureDataSum, Feature, FeatureView } from "../../app/overview/AbstractNodeFeature";
import { AbstractNodeFeatureGradient, FeatureGradientSettings, FeatureViewDecorator } from "../../app/overview/AbstractNodeFeatureView";
import { AbstractNodeShell } from "../../app/overview/AbstractNodeShell";

import FolderNode from "./FolderNode";

@FeatureViewDecorator()
export class NodeFeatureSize extends AbstractNodeFeatureGradient<FolderNode, FeatureDataSum> {

    public getNewSettingsInstance(): FeatureGradientSettings {
        return new FeatureGradientSettings(10, 1024 * 1024, FeatureView.gradient);
    }


    public getNewDataInstance(): FeatureDataSum {
        return new FeatureDataSum();
    }

    readonly id: Feature = Feature.FolderSize;
    min: number = 0;
    max: number = 1024 * 1024 * 1024 * 1024;
    public readonly  readableName: string ="Folder Size";

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

/**
 * Dieses Feature wird von Folder Nodes benutzt. Es nutzt einen Gradienten als view, dessen min und max werte hier enthalten sind.
 */
@FeatureViewDecorator()
export class NodeFeatureQuantity extends AbstractNodeFeatureGradient<FolderNode, FeatureDataSum> {

    public getNewSettingsInstance(): FeatureGradientSettings {
        return new FeatureGradientSettings(0, 64, FeatureView.gradient);
    }

    public getFeatureText(nodes: FolderNode, entry: AbstractNodeShell<FolderNode>): string {
        const data = nodes.getFeatureValue(Feature.FolderQuantity);
        return (data ? data.s + " Files" : "0 Files");
    }

    public getNewDataInstance(): FeatureDataSum {
        return new FeatureDataSum();
    }

    public getNodeRadius(node: FolderNode, entry: AbstractNodeShell<FolderNode>): number {
        return 0;
    }
    public readonly  readableName: string ="File Amount";


    getGradientValue(node: FolderNode): number {
        const data = node.getFeatureValue(Feature.FolderQuantity);
        return data ? data.s : 0;
    }

    readonly id: Feature = Feature.FolderQuantity;
    min: number = 0;
    max: number = 1024 * 1024;

}
