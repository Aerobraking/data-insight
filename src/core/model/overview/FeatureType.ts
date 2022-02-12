import { FeatureDataMedian, FeatureDataSum, FeatureDataList } from "./FeatureData";

/**
 * Unique identifier for each Feature
 */
export enum FeatureType {
    None = "N",
    FolderLastModify = "FLM", // last modifiy
    FolderSize = "FS",
    FolderQuantity = "FQ",
    FolderFileTypes = "FFA"
}

export type NodeFeatures = {
    [FeatureType.FolderLastModify]?: FeatureDataMedian,
    [FeatureType.FolderSize]?: FeatureDataSum,
    [FeatureType.FolderQuantity]?: FeatureDataSum,
    [FeatureType.FolderFileTypes]?: FeatureDataList,
    [FeatureType.None]?: FeatureDataSum;
}
