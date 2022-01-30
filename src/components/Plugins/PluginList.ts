export * from './Rearrange'
export * from './FitAspectRatio'
export * from './NormalizeSize'
import { RegisteredPlugins } from "../app/plugins/AbstractPlugin"

export function getPlugins() {
    return RegisteredPlugins;
}