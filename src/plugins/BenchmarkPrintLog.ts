import { OverviewEngine } from "@/core/components/overview/OverviewEngine";
import { doBenchmark } from "@/core/utils/Benchmark";
import { PluginAdapter, PluginDecorator } from "../core/plugin/AbstractPlugin"

@PluginDecorator()
export default class FitAspectRatio extends PluginAdapter {

    readonly description: string = "<kbd>F3</kbd>";
    readonly name: string = "BENCH Print log";
    readonly shortcut: string = "global f3";

    constructor() { super(); }

    public init(): void { 
        if (doBenchmark) OverviewEngine.printLog();
        this.workspace.finishPlugin();
    }

}