import { AbstractNodeFeature, internalCreateNewFeatureList } from '../app/overview/AbstractNodeFeatureView';

/**
 * All Features have to be imported here so.
 * 
 */
export * from './filesystem/FolderFeatures'


export function getFeatureList(): AbstractNodeFeature[] {
    return internalCreateNewFeatureList();
}
