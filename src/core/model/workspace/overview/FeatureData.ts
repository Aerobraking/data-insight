import { Expose } from "class-transformer";
 
/**
 * A unique type that identifies each class that implements AbstractFeatureData.
 */
export enum FeatureDataType {
    MEDIAN = "M",
    SUM = "S",
    LIST = "L"
}

export abstract class AbstractFeatureData {
    abstract t: FeatureDataType;
}

@Expose({ name: "FDM" })
export class FeatureDataMedian extends AbstractFeatureData {
    // size 
    m: number | undefined = undefined; // the sum of the values of the entries divided through "c"
    c: number = 0; // number of entries
    t = FeatureDataType.MEDIAN;
}

@Expose({ name: "FDS" })
export class FeatureDataSum extends AbstractFeatureData {
    // size 
    s: number = 0;
    t = FeatureDataType.SUM;
}

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

export const FeatureDataHandler: FeatureDataHandlerIfc = {
    [FeatureDataType.MEDIAN]: (data: FeatureDataMedian, dataToAdd: FeatureDataMedian[]) => {
        //  debugger
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
    [FeatureDataType.SUM]: (data: FeatureDataSum, dataToAdd: FeatureDataSum[]) => {
        dataToAdd.forEach(d=>data.s+=d.s);
    },
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