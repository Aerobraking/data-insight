import { OverviewEngine } from "@/core/components/overview/OverviewEngine";
import { doBenchmark } from "@/core/utils/Benchmark";
import { PluginAdapter, PluginDecorator } from "../core/plugin/AbstractPlugin"

/**
 * Only usable in the App when benchmarking is enabled. Prints the logged data to the console.
 */
@PluginDecorator(doBenchmark)
export default class FitAspectRatio extends PluginAdapter {

    readonly description: string = "<kbd>F3</kbd>";
    readonly name: string = "BENCH Print log";
    readonly shortcut: string = "ov f3";
    readonly domain = "gl";

    constructor() { super(); }
    public isModal(): boolean {
        return false;
    }
    public init(): void {
        if (doBenchmark) OverviewEngine.printLog();
        this.workspace.finishPlugin();
    }

}