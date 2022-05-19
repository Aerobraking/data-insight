import { Expose } from "class-transformer";

/**
 * A unique type that identifies each class that implements AbstractFeatureData.
 */
export enum FeatureDataType {
    MEDIAN = "M",
    SUM = "S",
    LIST = "L"
}

/**
 * The abstract class for all FeatureData Implementations. Makes sure every one has a unique Type enum.
 */
export abstract class AbstractFeatureData {
    abstract t: FeatureDataType;
}

/**
 * Is used for calculating a median value out of a list of values.
 */
@Expose({ name: "FDM" })
export class FeatureDataMedian extends AbstractFeatureData {
    // size 
    m: number | undefined = undefined; // the sum of the values of the entries divided through "c"
    c: number = 0; // number of entries
    t = FeatureDataType.MEDIAN;
}

/**
 * Sums up all values from a list.
 */
@Expose({ name: "FDS" })
export class FeatureDataSum extends AbstractFeatureData {
    // size 
    s: number = 0;
    t = FeatureDataType.SUM;
}

/**
 * Creates a list of keys and for each key a value that says how many times the key occours.
 */
@Expose({ name: "FDL" })
export class FeatureDataList extends AbstractFeatureData {
    // list of element occurences 
    l: { [any: string]: number } = {};
    t = FeatureDataType.LIST;
}

export type AbstractFeaturesDataHandlerTypes = {
    [K in FeatureDataType]: (data: any, dataToAdd: any[]) => void
}

export interface FeatureDataHandlerIfc extends AbstractFeaturesDataHandlerTypes {
    [FeatureDataType.MEDIAN]: (data: FeatureDataMedian, dataToAdd: FeatureDataMedian[]) => void
    [FeatureDataType.SUM]: (data: FeatureDataSum, dataToAdd: FeatureDataSum[]) => void
    [FeatureDataType.LIST]: (data: FeatureDataList, dataToAdd: FeatureDataList[]) => void
}

/**
 * EXTEND APP: Register new FeatureDataType Entries
 * 
 * When creating a new FeatureData from the AbstractFeatureData, 
 * an Entry needs to be added for the new FeatureDataType that handles how
 * the FeatureData is combined when it es recursivly added to the node tree.
 */
export const FeatureDataHandler: FeatureDataHandlerIfc = {
    /**
     * The Median sums up the median values of the children with the median of the parent. Each median value
     * will be weighted by the number of elements it represents to get a correct median. :)
     * @param data The FeatureData from a node.
     * @param dataToAdd The FeatureData from the children of the node that have to be added to the
     * parents FeatureData.
     */
    [FeatureDataType.MEDIAN]: (data: FeatureDataMedian, dataToAdd: FeatureDataMedian[]) => {

        if (data.m == undefined) data.m = 0, data.c = 0; // init value if not present
        let sumEntries = data.c;
        dataToAdd.forEach(d => d.m != undefined && d.c > 0 ? sumEntries += d.c : ""); // get the total amount of entries

        const getShare = (d: FeatureDataMedian) => (d.m != undefined && d.c > 0) ? d.m * (d.c / sumEntries) : 0;  // add the median value based on the percentage it takes of all the entries
        let newMedian = getShare(data);

        for (const d of dataToAdd) {
            newMedian += getShare(d);
        }

        sumEntries > 0 ? (() => { data.c = sumEntries, data.m = Math.floor(newMedian); })() : "";

    },
    /**
     * We simply sum up all the separate sums of the children to our parent sum
     * @param data The FeatureData from a node.
     * @param dataToAdd The FeatureData from the children of the node that have to be added to the
     * parents FeatureData.
     */
    [FeatureDataType.SUM]: (data: FeatureDataSum, dataToAdd: FeatureDataSum[]) => {
        dataToAdd.forEach(d => data.s += d.s);
    },
    /**
     * We simply sum up all the seperate values of each key from the children lists to our
     * parent list.
     * @param data The FeatureData from a node.
     * @param dataToAdd The FeatureData from the children of the node that have to be added to the
     * parents FeatureData.
     */
    [FeatureDataType.LIST]: (data: FeatureDataList, dataToAdd: FeatureDataList[]) => {
        for (const d of dataToAdd) {
            Object.keys(d.l).forEach((key: string) => {
                if (data.l[key]) {
                    data.l[key] += d.l[key];
                } else {
                    data.l[key] = d.l[key];
                }
            })
        }
    }
}