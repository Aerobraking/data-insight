export * from './Rearrange'
export * from './FitAspectRatio'
export * from './NormalizeSize'
import { PluginAdapter, PluginDecorator, RegisteredPlugins } from "@/core/plugin/AbstractPlugin"

export function getPlugins() {
    return RegisteredPlugins;
}