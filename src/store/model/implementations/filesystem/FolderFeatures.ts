import { filesizeFormat } from "@/utils/format";
import { FeatureDataSum, Feature } from "../../app/overview/AbstractNodeFeature";
import { AbstractNodeFeatureGradient, FeatureDecorator } from "../../app/overview/AbstractNodeFeatureRender";
import { AbstractNodeShell } from "../../app/overview/AbstractNodeShell";
  
import FolderNode from "./FolderNode";

@FeatureDecorator()
export class NodeFeatureSize extends AbstractNodeFeatureGradient<FolderNode, FeatureDataSum> {

    public getNewDataInstance(): FeatureDataSum {
        return new FeatureDataSum();
    }

    readonly id: Feature = Feature.FolderSize;
    min: number = 0;
    max: number = 1024 * 1024 * 1024 * 1024;

    public getNodeRadius(node: FolderNode, entry: AbstractNodeShell<FolderNode>): number {
        return 0;
    }

    public getNodeColor(nodes: FolderNode, entry: AbstractNodeShell<FolderNode>): string {
        throw new Error("Method not implemented.");
    }

    getGradientValue(node: FolderNode): number {
        const data = node.getFeatureValue<FeatureDataSum>(Feature.FolderSize);
        return data ? data.s : 0;
    }

    public getFeatureText(nodes: FolderNode, entry: AbstractNodeShell<FolderNode>): string {
        const data = nodes.getFeatureValue<FeatureDataSum>(Feature.FolderSize);
        return data ? filesizeFormat(data.s) : "- MB";
    }
}

/**
 * Dieses Feature wird von Folder Nodes benutzt. Es nutzt einen Gradienten als view, dessen min und max werte hier enthalten sind.
 */
@FeatureDecorator()
export class NodeFeatureQuantity extends AbstractNodeFeatureGradient<FolderNode, FeatureDataSum> {


    public getFeatureText(nodes: FolderNode, entry: AbstractNodeShell<FolderNode>): string {
        const data = nodes.getFeatureValue<FeatureDataSum>(Feature.FolderQuantity);
        return data ? data.s + " Files" : "0 Files";
    }

    public getNewDataInstance(): FeatureDataSum {
        return new FeatureDataSum();
    }

    public getNodeRadius(node: FolderNode, entry: AbstractNodeShell<FolderNode>): number {
        return 0;
    }

    public getNodeColor(nodes: FolderNode, entry: AbstractNodeShell<FolderNode>): string {
        throw new Error("Method not implemented.");
    }

    getGradientValue(node: FolderNode): number {
        const data = node.getFeatureValue<FeatureDataSum>(Feature.FolderQuantity);
        return data ? data.s : 0;
    }

    readonly id: Feature = Feature.FolderQuantity;
    min: number = 0;
    max: number = 1024 * 1024;

}
