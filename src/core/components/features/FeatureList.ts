import { AbstractNodeFeature, internalCreateNewFeatureList } from '../../model/overview/AbstractNodeFeatureView';

/**
 * All Features have to be imported here so.
 * 
 */
export * from '../../../filesystem/model/FolderFeatures'
import * as FN from '../../model/overview/FeatureNone'
 
export function getFeatureList(): AbstractNodeFeature[] { 
    return internalCreateNewFeatureList();
}
