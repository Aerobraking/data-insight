import { AbstractNodeFeature, internalCreateNewFeatureList } from '../app/overview/AbstractNodeFeatureView';

/**
 * All Features have to be imported here so.
 * 
 */
export * from './filesystem/FolderFeatures'
import * as FN from './../app/overview/FeatureNone'
 
export function getFeatureList(): AbstractNodeFeature[] { 
    return internalCreateNewFeatureList();
}
