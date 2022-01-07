/**
 * All Features have to be imported here so.
 * 
 */
export * from './filesystem/FolderFeatures'
import { Constructor } from '@/components/app/plugins/Constructor';
import { Feature } from '../app/overview/AbstractNodeFeature';
import { AbstractNodeFeature, FeatureConstructorList, FeatureInstanceList } from '../app/overview/AbstractNodeFeatureRender';




export function test() {
    // const features: FolderNodeFeatures = {
    //     [Feature.FolderFileTypes]: new FeatureDataList(),
    //     [Feature.FolderQuantity]: new FeatureDataSize(),
    //     [Feature.FolderSize]: new FeatureDataSize()
    // };

    // const fff = features[Feature.FolderFileTypes];
    // if (fff) { 
    //     fff.l[""] = 4;
    // } 

    // Object.values(Feature).forEach((stringValue) => {

    //     /**
    //      * When the feature data does not exist, 
    //      */
    //     if (features[stringValue] == undefined) {
    //         if (FeatureInstanceList[stringValue] != undefined) {
    //             const d: any = FeatureInstanceList[stringValue]?.getNewDataInstance();
    //             // weise fehlende Feature Data zu
    //             console.log("create new feature data:", stringValue, features[stringValue]);
    //             if (d) features[stringValue] = d;
    //         }
    //     }
    // });
}

test();