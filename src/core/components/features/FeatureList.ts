import { AbstractFeature, internalCreateNewFeatureList } from '../../model/overview/AbstractFeature';

/**
 * All Features have to be imported here so.
 * 
 */
export * from '../../../filesystem/model/FolderFeatures'
import * as FN from '../../model/overview/FeatureNone'
 
export function getFeatureList(): AbstractFeature[] { 
    return internalCreateNewFeatureList();
}
