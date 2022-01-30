import { AbstractNode } from "./AbstractNode";
import { AbstractFeatureData, FeatureDataType, Feature } from "./AbstractNodeFeature";
import { AbstractFeatureSettings, AbstractNodeFeature, FeatureViewDecorator } from "./AbstractNodeFeatureView";
import { AbstractNodeShell } from "./AbstractNodeShell";

export class FeatureNoneSettings extends AbstractFeatureSettings {

}
export class FeatureNoneData extends AbstractFeatureData {
    t: FeatureDataType = FeatureDataType.SUM;
}

@FeatureViewDecorator()
export class NodeFeatureNone extends AbstractNodeFeature<AbstractNode, FeatureNoneData, FeatureNoneSettings> {
    public id = Feature.None;
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
    public getNodeRadius(nodes: AbstractNode, entry: AbstractNodeShell<AbstractNode>): number {
        return 100;
    }
    public isNodeHidden(nodes: AbstractNode, entry: AbstractNodeShell<AbstractNode>): boolean {
        return false;
    }
    public getNodeColor(nodes: AbstractNode, entry: AbstractNodeShell<AbstractNode>): string {
        return "white";
    }
    public getFeatureText(nodes: AbstractNode, entry: AbstractNodeShell<AbstractNode>): string {
        return "";
    }
}