/**
 * EXTEND APP
 * 
 * All AbstractFeature implementations have to be imported here. 
 */
export * from '../../../../filesystem/model/FolderFeatures'
export * as FN from './FeatureNone'

export function initAllFeatures(): void {
    console.log("All Feature classes loaded.");
}
