import Gradient from "@/core/model/workspace/overview/Gradient";
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

/**
 * This Decorator has to be added to all Implementations of the AbstractFeature class.
 * It collects the classes so the Features can be created automatically for using them
 * in the Overview. It creates the Vue Components for each Feature in the OverviewView
 * and the FeatureSettings for each feature and add them to a new created Overview Instance
 * so the settings can be used for the FeatureViews.
 * @returns 
 */
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
 
/**
 * Creates and returns a list with one Instance of all AbstractFeature implementations.
 * @returns 
 */
export function getFeatureList(): AbstractFeature[] {
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

/**
 * A feature needs a Settings class which controls how the Feature
 * visualize the nodes. Different Features can use the same settings class
 * when it fits their requirements
 */
export abstract class AbstractFeatureSettings { }

/**
 * This Gradient Settings will be used for the AbstractFeatureGradient class Implementations.
 */
export class FeatureGradientSettings extends AbstractFeatureSettings {

    constructor(slider0: number,
        slider1: number,) {
        super();
        this.sliderRange = [slider0, slider1];
    }

    /**
     * The range for the slider in the view. 
     */
    sliderRange: [number, number];
    /**
     * The id of the current active gradient in the AbstractFeatureGradient.
     */
    gradientId: string = "interpolateWarm";
    /**
     * true: sets sliderRange values automatically 
     */
    public autoSetRange: boolean = false;
}

/**
 * The abstract class for each Feature.
 * A Feature is some kind of information that is available for all nodes. For example the amount
 * of files that are in each (Folder)Node.
 * A Feature needs a settings class which describes how the feature should visualize the Nodes. 
 * The settings usually should be editable by the user. 
 * The class is then responsible to return the size, color, text and visibility for each node.
 */
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

    /**
     * When the Feature Data is generated for a node, we need to create an "empty" data object for using
     * it in the node.
     */
    public abstract getNewDataInstance(): D;

    /**
     * When an Overview is created, it needs to get the default settings for all features, so these settings
     * can then be used in the Feature Views. 
     */
    public abstract getNewSettingsInstance(): S;

    /**
      * @param node the node where you get the radius for.
      * @param tree The tree where this node bleongs to.
      * @returns number: the radius for the circle that is rendered for the node in the overview.
      */
    public abstract getNodeRadius(
        node: N, tree: AbstractNodeTree<N>
    ): number;

    /**
     * @param node the node which is testes for wether it is hidden.
     * @param tree The tree where this node bleongs to.
     * @returns true: the node will be partially hidden in the overview, false: the node will be displayed normally.
     */
    public abstract isNodeHidden(
        node: N, tree: AbstractNodeTree<N>
    ): boolean;

    /** 
     * @param node The node where you want to get the color string for.
     * @param tree The node where this node belongs to.
     * @returns a color string that is usable by the Canvas API of Chrome. "h" means the node should be hidden.
     */
    public abstract getNodeColor(
        node: N, tree: AbstractNodeTree<N>
    ): string | "h";

    /** 
     * @param node The node where you want to get the color string for.
     * @param tree The node where this node belongs to.
     * @returns a  string that is displayed in the overview underneath the name of the Node.
     */
    public abstract getFeatureText(
        node: N, tree: AbstractNodeTree<N>
    ): string;

}

/**
 * When your FeatureData has a single numerical value you want to visualize with a ColorGradient,
 * you can extend this class. It provides all the code for it and you only need to implement
 * the numerical value you want to use and the Slider Range.
 */
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
     * Returns the index for the next greate xVal Value.
     * @param {*} value  The value in Byte
     * @param {*} arr The Byte value 
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

    /**
     * The List of Gradients styles the user can use.
     */
    public gradients: Gradient[] = [
        new Gradient((n: number) => {
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

    /**
     * Changes the active gradient that is used for coloring the node in the getNodeColor() method.
     * @param name the id of the gradient that is stored inside the Gradient Objects.
     * @returns The now active Gradient Object.
     */
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

    /**
     * It takes the numerical value of the feature data of the node and converts it
     * to the range inside the gradient. The "Stepping" of the values in the noUislider may
     * not be linear so we use the toStepping() from NoUISlider to convert the value so it gets
     * the correct value between 0 ... 100% in the color gradient.
     * @param node 
     * @param entry 
     * @returns 
     */
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

}


