import { AbstractFeature, internalCreateNewFeatureList } from '../../model/workspace/overview/AbstractFeature';

/**
 * All Features have to be imported here so.
 * 
 */
export * from '../../../filesystem/model/FolderFeatures'
import * as FN from '../../model/workspace/overview/FeatureNone'
 
export function getFeatureList(): AbstractFeature[] { 
    return internalCreateNewFeatureList();
}
