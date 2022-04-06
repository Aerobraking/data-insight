import { AbstractNode } from "./AbstractNode";
import { AbstractFeatureData, FeatureDataType } from "./FeatureData";
import { AbstractFeatureSettings, AbstractFeature, FeatureViewDecorator } from "./AbstractFeature";
import { AbstractNodeTree } from "./AbstractNodeTree";
import { FeatureType } from "./FeatureType";

export class FeatureNoneSettings extends AbstractFeatureSettings {}

export class FeatureNoneData extends AbstractFeatureData {
    t: FeatureDataType = FeatureDataType.SUM;
}

@FeatureViewDecorator()
export class NodeFeatureNone extends AbstractFeature<AbstractNode, FeatureNoneData, FeatureNoneSettings> {
    public id = FeatureType.None;
    public readableName = "None";

    constructor() { 
        super();
    }

    public getNewDataInstance(): FeatureNoneData {
        return new FeatureNoneData();
    }
    public getNewSettingsInstance(): FeatureNoneSettings {
        return new FeatureNoneSettings();
    }
    public getNodeRadius(nodes: AbstractNode, entry: AbstractNodeTree<AbstractNode>): number {
        return 100;
    }
    public isNodeHidden(nodes: AbstractNode, entry: AbstractNodeTree<AbstractNode>): boolean {
        return false;
    }
    public getNodeColor(nodes: AbstractNode, entry: AbstractNodeTree<AbstractNode>): string {
        return "white";
    }
    public getFeatureText(nodes: AbstractNode, entry: AbstractNodeTree<AbstractNode>): string {
        return "";
    }
}