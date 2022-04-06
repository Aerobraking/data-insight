import Gradient from "@/core/components/overview/Gradient";
import { AbstractNode } from "./AbstractNode";
import { AbstractFeatureData } from "./FeatureData";
import { AbstractNodeTree } from "./AbstractNodeTree";
import * as d3 from "d3";
import { Constructor } from "@/core/plugin/Constructor";
import { FeatureType } from "./FeatureType";

export const FeatureConstructorList: Constructor<AbstractFeature>[] = [];

export const FeatureInstanceList: {
    [K in FeatureType]?: AbstractFeature;
} = {};

export function FeatureViewDecorator() {
    return function <T extends Constructor<AbstractFeature>>(target: T) {
        if (FeatureConstructorList) {
            FeatureConstructorList.push(target);
        }
        let instance = new target();
        const f: FeatureType = instance.id as FeatureType;
        FeatureInstanceList[f] = instance;
    };
}

export function internalCreateNewFeatureList(): AbstractFeature[] {
    let list = [];
    for (let i = 0; i < FeatureConstructorList.length; i++) {
        const f = FeatureConstructorList[i];
        list.push(new f());
    }
    return list;
}

export type FeatureSettingsList = {
    [K in FeatureType]?: AbstractFeatureSettings;
}

export abstract class AbstractFeatureSettings { }

export abstract class AbstractFeature<N extends AbstractNode = AbstractNode, D extends AbstractFeatureData = AbstractFeatureData, S extends AbstractFeatureSettings = AbstractFeatureSettings> {

    settings!: S;

    /**
     * Identifies the Feature, has to be unique  and also links to the vue component name for the view.
     */
    public readonly abstract id: FeatureType;
    public readonly abstract readableName: string;

    constructor() {
        this.settings = this.getNewSettingsInstance();
    }

    public abstract getNewDataInstance(): D;
    public abstract getNewSettingsInstance(): S;

    public abstract getNodeRadius(
        nodes: N, entry: AbstractNodeTree<N>
    ): number;
    
    public abstract isNodeHidden(
        nodes: N, entry: AbstractNodeTree<N>
    ): boolean;

    public abstract getNodeColor(
        nodes: N, entry: AbstractNodeTree<N>
    ): string | "h";

    public abstract getFeatureText(
        nodes: N, entry: AbstractNodeTree<N>
    ): string;

}

export class FeatureGradientSettings extends AbstractFeatureSettings {

    constructor(slider0: number,
        slider1: number,) {
        super();
        this.sliderRange = [slider0, slider1];
    }

    sliderRange: [number, number];
    gradientId: string = "interpolateWarm";
    public autoSetRange: boolean = false;
}

export abstract class AbstractFeatureGradient<N extends AbstractNode = AbstractNode, D extends AbstractFeatureData = AbstractFeatureData>
    extends AbstractFeature<N, D, FeatureGradientSettings> {


    // #################
    //
    // The Following static functions are extracted from the NoUISlider Package (and modified for being usable in my code) for rectrieving the percentage value of the slider.
    //
    // #################

    static subRangeRatio(pa: number, pb: number) {
        return 100 / (pb - pa);
    }

    /**
     * (percentage) How many percent is this value of this range?
     * @param {*} range  [2]number
     * @param {*} value 
     * @param {*} startRange number, normalerweise 0
     * @returns 
     */
    static fromPercentage(range: number[], value: number, startRange: number) {
        return (value * 100) / (range[startRange + 1] - range[startRange]);
    }

    /**
     * (percentage) Where is this value on this range?
     * @param {*} range [2]number
     * @param {*} value number
     * @returns 
     */
    static toPercentage(range: number[], value: number) {
        return AbstractFeatureGradient.fromPercentage(range, range[0] < 0 ? value + Math.abs(range[0]) : value - range[0], 0);
    }

    /**
     * Gibt den index zurück des nächst größeren xVal.
     * @param {*} value  Der Wert in Bytes
     * @param {*} arr Konkrete Byte Werte 
     * @returns 
     */
    static getJ(value: number, arr: number[]) {
        var j = 1;
        while (value >= arr[j]) {
            j += 1;
        }
        return j;
    }

    /**
     * (percentage) Input a value, find where, on a scale of 0-100, it applies.
     * @param {*} xVal Actual values, like 0 bytes to 194523452345 bytes
     * @param {*} xPct The percentage values that belong to the xVal, like 0, 20, 40, usw.
     * @param {*} value The given value, in our example 923423 bytes
     * @returns 
     */
    static toStepping(xVal: number[], xPct: number[], value: number) {

        // ist unser wert größer als das maximum, geb 100 zurück
        if (value >= xVal.slice(-1)[0]) {
            return 100;
        }
        // nächstgrößerer index
        var j = AbstractFeatureGradient.getJ(value, xVal);
        // nächstkleinerer xVal wert
        var va = xVal[j - 1];
        // nächstgrößerer xVal wert
        var vb = xVal[j];
        // nächstkleinerer prozent wert
        var pa = xPct[j - 1];
        // nächstgrößerer prozent wert
        var pb = xPct[j];
        return pa + AbstractFeatureGradient.toPercentage([va, vb], value) / AbstractFeatureGradient.subRangeRatio(pa, pb);
    }

    constructor(range: { min: number, max: number, [key: string]: number }) {
        super();
        // parse range data for calculating color in the getNodeColor()
        this.range = range;
        this.colorFunction = this.gradients[0].getColor;
        this.rangePercentage = [0];
        Object.keys(this.range).forEach(k => (!isNaN(Number(k))) ? this.rangePercentage.push(Number(k)) : []);
        this.rangePercentage.push(100);
        this.rangeValues = Object.values(this.range).map((i) => Number(i)).sort((n1, n2) => n1 - n2);
        // init color function
        this.setGradienFunction("");
    }

    private rangeValues: number[];
    private rangePercentage: number[];

    /**
     * Interface from nouislider
     */
    public readonly range: {
        min: number;
        max: number;
        [key: string]: number;
    };

    public gradients: Gradient[] = [
        new Gradient((n: number) => {
            // let value = n * 255 * 0.3;
            const value = 215;
            return `rgb(${value},${value},${value})`;
        }, "default"),
        new Gradient(d3.interpolateWarm, "interpolateWarm"),
        new Gradient(
            d3.interpolateInferno,
            "interpolateInferno",
            !true,
            d3.scaleLinear<number>().domain([0, 1]).clamp(true).range([0.3, 1]),
            [0.3, 1]
        ),
        new Gradient(d3.interpolateYlOrRd, "interpolateYlOrRd", true),
        new Gradient(d3.interpolateViridis, "interpolateViridis", true),
        new Gradient(d3.interpolateRdBu, "interpolateRdBu", !true), 
        new Gradient(d3.interpolateYlGn, "interpolateYlGn", true),
    ];

    public abstract formatter: (value: number) => string;
    public abstract margin: number;
    public abstract id: FeatureType;
    public abstract readonly readableName: string;
    private gradientIDInUse: string | undefined;

    public setGradienFunction(name: string): Gradient {
        let gradient: Gradient | undefined = this.gradients.find((g) => g.id == name);
        gradient = gradient ? gradient : this.gradients[0]; 
        if (gradient) this.colorFunction = (n: number) => {
            return (gradient as Gradient).getColor(n);
        };;
        this.settings.gradientId = name;
        this.gradientIDInUse = name;
        return gradient;
    }

    public isNodeHidden(nodes: N, entry: AbstractNodeTree<N>): boolean {
        return this.getNodeColor(nodes, entry) == "h";
    }

    public colorFunction?: (n: number) => string;

    public abstract getGradientValue(node: N): number | undefined;

    public getNodeColor(node: N, entry: AbstractNodeTree<N>): string {

        if (this.settings.gradientId != this.gradientIDInUse) {
            this.setGradienFunction(this.settings.gradientId)
        }

        if (this.colorFunction) {

            let data = this.getGradientValue(node);
            if (data) {
                // round the numbers to the < | > works correctly with the large numbers.
                const max = Math.round(this.settings.sliderRange[1]), min = Math.round(this.settings.sliderRange[0]);
                const value = Math.round(data) > max && !false ? max : Math.round(data);
                const p = AbstractFeatureGradient.toStepping(this.rangeValues, this.rangePercentage, value);
                const pmin = AbstractFeatureGradient.toStepping(this.rangeValues, this.rangePercentage, min);
                const pmax = AbstractFeatureGradient.toStepping(this.rangeValues, this.rangePercentage, max);
                const pR = Math.min(1, (p - pmin) / (pmax - pmin));

                return p < pmin || p > pmax ? "h" : this.colorFunction(1 - pR);
            }

            return "white";
        }
        return "white";
    }

    public getNodeRadius(node: N, entry: AbstractNodeTree<N>): number {
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
}


