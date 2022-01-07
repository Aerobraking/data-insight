import { Constructor } from "@/components/app/plugins/Constructor";
import { AbstractNode } from "./AbstractNode";
import { FeatureData, Feature, FeatureDataSum } from "./AbstractNodeFeature";
import { AbstractNodeShell } from "./AbstractNodeShell";

export const FeatureConstructorList: Constructor<AbstractNodeFeature>[] = [];

export const FeatureInstanceList: {
    [K in Feature]?: AbstractNodeFeature;
} = {};
 
export function FeatureDecorator() {
    return function <T extends Constructor<AbstractNodeFeature>>(target: T) {
        if (FeatureConstructorList) {
            FeatureConstructorList.push(target);
        }
        let instance = new target();
        const f: Feature = instance.id as Feature;
        FeatureInstanceList[f] = instance;
    };
}


export abstract class AbstractNodeFeature<N extends AbstractNode = AbstractNode, D extends FeatureData = FeatureData> {
    // the 
    nodeType: N;

    constructor(nodeType: N) {
        this.nodeType = nodeType;
    }

    /**
     * Identifies the Feature, has to be unique.  
     */
    public readonly abstract id: Feature;
    /**
     * This defines the "Type" of the Feature and also links to the vue component name for the view.
     */
    public readonly abstract viewType: "gradient";

    public abstract getNewDataInstance(): D;

    // public abstract drawNode(
    //     ctx: CanvasRenderingContext2D, nodes: N[], widths: { x: number, width: number }[], entry: AbstractNodeShell<N>
    // ): void;

    public abstract getNodeRadius(
        nodes: N, entry: AbstractNodeShell<N>
    ): number;

    public abstract getNodeColor(
        nodes: N, entry: AbstractNodeShell<N>
    ): string;

    public abstract getFeatureText(
        nodes: N, entry: AbstractNodeShell<N>
    ): string;
}

export abstract class AbstractNodeFeatureGradient<N extends AbstractNode = AbstractNode, D extends FeatureData = FeatureData> extends AbstractNodeFeature<N, D> {
    readonly abstract min: number;
    readonly abstract max: number;

    public viewType: "gradient" = "gradient";

    public getNodeRadius(node: N, entry: AbstractNodeShell<N>): number {
        const data = node.getFeatureValue<FeatureDataSum>(Feature.FolderSize);

        if (node.isRoot()) {
            return 100;
        } else {
            let abs = entry.root.getFeatureValue<FeatureDataSum>(Feature.FolderSize);
            let part = node.getFeatureValue<FeatureDataSum>(Feature.FolderSize);
            if (abs != undefined && part != undefined) {
                let r = abs.s > 0 ? Math.sqrt(31415 * (part.s / abs.s) / Math.PI) : 1;
                r = 100 * 0.1 + r * 0.9;
                return Math.max(r, 16);
            }
        }
        return 16;
    }
    abstract getGradientValue(node: N): number;
}


