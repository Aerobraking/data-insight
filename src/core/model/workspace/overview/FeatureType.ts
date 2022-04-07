import { FeatureDataMedian, FeatureDataSum, FeatureDataList } from "./FeatureData";

/**
 * EXTEND APP
 * 
 * Unique identifier for each Feature
 */
export enum FeatureType {
    None = "N",
    FolderLastModify = "FLM", // last modifiy
    FolderSize = "FS",
    FolderQuantity = "FQ",
    FolderFileTypes = "FFA"
}

/**
 * An Object that contains FeatureData Instances for the according Feature(types).
 */
export type Features = {
    [FeatureType.FolderLastModify]?: FeatureDataMedian,
    [FeatureType.FolderSize]?: FeatureDataSum,
    [FeatureType.FolderQuantity]?: FeatureDataSum,
    [FeatureType.FolderFileTypes]?: FeatureDataList,
    [FeatureType.None]?: FeatureDataSum;
}
