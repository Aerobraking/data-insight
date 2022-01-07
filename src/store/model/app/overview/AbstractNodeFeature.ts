import { Expose } from "class-transformer"; 

export enum FeatureDataType {
    MEDIAN = "M",
    SUM = "S",
    LIST = "L"
}

export enum Feature {
    FolderSize = "FS",
    FolderQuantity = "FQ",
    FolderFileTypes = "FFA"

}
export abstract class FeatureData {
    abstract t: FeatureDataType;
}

@Expose({ name: "FDM" })
export class FeatureDataMedian extends FeatureData {
    // size 
    s: number = 0;
    t = FeatureDataType.MEDIAN;
}

@Expose({ name: "FDS" })
export class FeatureDataSum extends FeatureData {
    // size 
    s: number = 0;
    t = FeatureDataType.SUM;
}

@Expose({ name: "FDL" })
export class FeatureDataList extends FeatureData {
    // list of element occurences 
    l: { [any: string]: number } = {};
    t = FeatureDataType.LIST;
}
 
/**
 * An Object that can contain any type of FeatureData
 */
export type NodeFeaturesRequired = {
    [Feature.FolderSize]: FeatureDataSum,
    [Feature.FolderQuantity]: FeatureDataSum,
    [Feature.FolderFileTypes]: FeatureDataList,
}

export type NodeFeatures = {
    [Feature.FolderSize]?: FeatureDataSum,
    [Feature.FolderQuantity]?: FeatureDataSum,
    [Feature.FolderFileTypes]?: FeatureDataList,
}

export class NodeFeaturesClass  {
    [Feature.FolderSize]?: FeatureDataSum;
    [Feature.FolderQuantity]?: FeatureDataSum;
    [Feature.FolderFileTypes]?: FeatureDataList;
}

export type AbstractNodeFeaturesTypes = {
    [K in FeatureDataType]: (data: any, dataToAdd: any[]) => void
}

export interface FeatureDataHandlerIfc extends AbstractNodeFeaturesTypes {
    [FeatureDataType.MEDIAN]: (data: FeatureDataSum, dataToAdd: FeatureDataSum[]) => void
    [FeatureDataType.SUM]: (data: FeatureDataSum, dataToAdd: FeatureDataSum[]) => void
    [FeatureDataType.LIST]: (data: FeatureDataList, dataToAdd: FeatureDataList[]) => void
}

export const FeatureDataHandler: FeatureDataHandlerIfc
    = {

    [FeatureDataType.MEDIAN]: (data: FeatureDataSum, dataToAdd: FeatureDataSum[]) => {
        let divider = 0;
        for (const d of dataToAdd) {
            data.s += d.s;
        }
    },
    [FeatureDataType.SUM]: (data: FeatureDataSum, dataToAdd: FeatureDataSum[]) => {
        for (const d of dataToAdd) {
            data.s += d.s;
        }
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

/**
 * Jedes Feature braucht ein enum oder string als ident. Das muss im Node und hier im Feature hinterlegt werden.
 * Die Features werden dann mit ihrer View in der Overview geladen.
 * Die Features brauchen einen Typen der sagt wie sie kombiniert werden in den Nodes. Mir fallen ein:
 * Sum
 * Average
 * List {jpg:23,png:4,ini}
 * Für jedes Feature ne Klasse erstellen die Berechnungen im Node durchführen per Klassen Instanzen Liste?
 * Das Rendering in der Overview auch pro Feature machen?
 */
