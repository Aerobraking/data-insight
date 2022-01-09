import { Constructor } from "@/components/app/plugins/Constructor";
import { AbstractNode } from "./AbstractNode";
import { FeatureData, Feature, FeatureDataSum, FeatureView } from "./AbstractNodeFeature";
import { AbstractNodeShell } from "./AbstractNodeShell";

export const FeatureConstructorList: Constructor<AbstractNodeFeature>[] = [];

export const FeatureInstanceList: {
    [K in Feature]?: AbstractNodeFeature;
} = {};

export function FeatureViewDecorator() {
    return function <T extends Constructor<AbstractNodeFeature>>(target: T) {
        if (FeatureConstructorList) {
            FeatureConstructorList.push(target);
        }
        let instance = new target();
        const f: Feature = instance.id as Feature;
        FeatureInstanceList[f] = instance;
    };
}

export function internalCreateNewFeatureList(): AbstractNodeFeature[] {
    let list = [];
    for (let i = 0; i < FeatureConstructorList.length; i++) {
        const f = FeatureConstructorList[i];
        list.push(new f());
    }
    return list;
}

export abstract class AbstractFeatureSettings {

}

export abstract class AbstractNodeFeature<N extends AbstractNode = AbstractNode, D extends FeatureData = FeatureData, S extends AbstractFeatureSettings = AbstractFeatureSettings> {
    // the 
    nodeType: N;
    settings!: S;

    constructor(nodeType: N) {
        this.nodeType = nodeType;
    }

    /**
     * Identifies the Feature, has to be unique.  
     */
    public readonly abstract id: Feature;
    public readonly abstract readableName: string;

    /**
     * This defines the "Type" of the Feature and also links to the vue component name for the view.
     */
    public readonly abstract viewType: FeatureView;


    public abstract getNewDataInstance(): D;
    public abstract getNewSettingsInstance(): S;

    // public abstract drawNode(
    //     ctx: CanvasRenderingContext2D, nodes: N[], widths: { x: number, width: number }[], entry: AbstractNodeShell<N>
    // ): void;

    public abstract getNodeRadius(
        nodes: N, entry: AbstractNodeShell<N>
    ): number;
    public abstract isNodeHidden(
        nodes: N, entry: AbstractNodeShell<N>
    ): boolean;

    public abstract getNodeColor(
        nodes: N, entry: AbstractNodeShell<N>
    ): string | "h";

    public abstract getFeatureText(
        nodes: N, entry: AbstractNodeShell<N>
    ): string;

}
export class FeatureGradientSettings extends AbstractFeatureSettings {

    constructor(slider0: number,
        slider1: number,
        viewType: FeatureView) {
        super();
        this.sliderRange = [slider0, slider1];
        this.viewType = viewType;
    }

    sliderRange: [number, number];
    viewType: FeatureView;
    gradientId: string = "interpolateWarm";
}

export type FeatureSettingsList = {
    [K in Feature]?: AbstractFeatureSettings;
}

export class AbstractNodeFeatureGradient<N extends AbstractNode = AbstractNode, D extends FeatureData = FeatureData> extends AbstractNodeFeature<N, D, FeatureGradientSettings> {

    public id!: Feature;
    public fooar!: Feature;
    public readonly readableName!: string;

    public getNewDataInstance(): D {
        throw new Error("Method not implemented.");
    }
    public getNewSettingsInstance(): FeatureGradientSettings {
        throw new Error("Method not implemented.");
    }

    public isNodeHidden(nodes: N, entry: AbstractNodeShell<N>): boolean {
        return this.getNodeColor(nodes, entry) == "h";
    }

    public colorFunction?: (n: number) => string;

    public getNodeColor(node: N, entry: AbstractNodeShell<N>): string {

        if (this.colorFunction) {


            let data = node.getFeatureValue(Feature.FolderSize);
            if (data) {
                const max = this.settings.sliderRange[1], min = this.settings.sliderRange[0];
                const value = data.s < min ? min - 1 : data.s > max ? max : data.s;

                return value < min || value > max
                    ? "h"
                    : this.colorFunction(1 - value / max);
            }

            return this.colorFunction(0);
        }
        return "white";

    }

    public getFeatureText(nodes: N, entry: AbstractNodeShell<N>): string {
        throw new Error("Method not implemented.");
    }

    readonly min: number = 0;
    readonly max: number = 100;

    public viewType = FeatureView.gradient;

    public getNodeRadius(node: N, entry: AbstractNodeShell<N>): number {
        if (node.isRoot()) {
            return 100;
        } else {
            let abs = entry.root.getFeatureValue(Feature.FolderSize);
            let part = node.getFeatureValue(Feature.FolderSize);
            if (abs != undefined && part != undefined) {
                let r = abs.s > 0 ? Math.sqrt(31415 * (part.s / abs.s) / Math.PI) : 1;
                r = 100 * 0.1 + r * 0.9;
                return Math.max(r, 16);
            }
        }
        return 16;
    }
}


