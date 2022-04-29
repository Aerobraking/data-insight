/**
 * EXTEND APP:register Plugin Files.
 */
export * from './Rearrange'
export * from './FitAspectRatio'
export * from './NormalizeSize'
export * from './BenchmarkPrintLog'
export * from './BenchmarkRandomMove'
export * from './BenchmarkToggleCulling'
import { RegisteredPlugins } from "@/core/plugin/AbstractPlugin"

export function getPlugins() {
    return RegisteredPlugins;
}