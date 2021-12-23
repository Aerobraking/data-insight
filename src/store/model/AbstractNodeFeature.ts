// import { Constructor } from "@/components/Plugins/AbstractPlugin";

// export abstract class AbstractNodeFeature {
//     readonly abstract isGradient: boolean;
//     readonly abstract id: string;
//     public getID(): string {
//         return this.id;
//     }
// }

// export abstract class AbstractNodeFeatureGradient extends AbstractNodeFeature {
//     readonly abstract min: number;
//     readonly abstract max: number;
// }

// export const registeredClasses: Constructor<AbstractNodeFeature>[] = [];
// export function FeatureDecorator() {
//     return function <T extends Constructor<AbstractNodeFeature>>(target: T) {
//         registeredClasses.push(target);
//     };
// }

// @FeatureDecorator()
// export class NodeFeatureSize extends AbstractNodeFeatureGradient {

//     readonly isGradient: boolean = true;
//     readonly id: string = "size";
//     min: number = 0;
//     max: number = 1024 * 1024 * 1024 * 1024;

// }

// @FeatureDecorator()
// export class NodeFeatureQuantity extends AbstractNodeFeatureGradient {

//     readonly isGradient: boolean = true;
//     readonly id: string = "quantity";
//     min: number = 0;
//     max: number = 1024 * 1024;

// }

// export function getFeatures(): AbstractNodeFeature[] {
//     const l: AbstractNodeFeature[] = [];

//     for (var x = 0; x < registeredClasses.length; x++) {
//         l.push(new registeredClasses[x]());
//     }
//     return l;

// }



