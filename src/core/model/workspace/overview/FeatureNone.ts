import { AbstractNode } from "./AbstractNode";
import { AbstractFeatureData, FeatureDataType } from "./FeatureData";
import { AbstractFeatureSettings, AbstractFeature, FeatureViewDecorator } from "./AbstractFeature";
import { AbstractNodeTree } from "./AbstractNodeTree";
import { FeatureType } from "./FeatureType";

export class FeatureNoneSettings extends AbstractFeatureSettings { }

export class FeatureNoneData extends AbstractFeatureData {
    t: FeatureDataType = FeatureDataType.SUM;
}

/**
 * This feature is used for simply showing the tree in an uniform color, so no FeatureData is used.
 */
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

    public getNodeRadius(node: AbstractNode, tree: AbstractNodeTree<AbstractNode>): number {
        return node.isRoot() ? 100 : 50;
    }

    public isNodeHidden(node: AbstractNode, tree: AbstractNodeTree<AbstractNode>): boolean {
        return false;
    }

    /**
     * All nodes simply get a white color
     * @param nodes 
     * @param entry 
     * @returns 
     */
    public getNodeColor(node: AbstractNode, tree: AbstractNodeTree<AbstractNode>): string {
        return "white";
    }

    /**
     * No subtext is provied for the nodes.
     * @param nodes 
     * @param entry 
     * @returns 
     */
    public getFeatureText(node: AbstractNode, tree: AbstractNodeTree<AbstractNode>): string {
        return "";
    }

}