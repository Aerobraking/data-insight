import { Instance as DataCache } from "@/core/model/workspace/overview/OverviewDataCache";
import { doBenchmark } from "@/core/utils/Benchmark";
import { PluginAdapter, PluginDecorator } from "../core/plugin/AbstractPlugin"

@PluginDecorator(doBenchmark)
export default class ToggleCulling extends PluginAdapter {

    readonly description: string = "<kbd>F1</kbd>";
    readonly name: string = "BENCH Print log";
    readonly shortcut: string = "ov f1";
    readonly domain = "ov";

    constructor() { super(); }
    public isModal(): boolean {
        return false;
    }
    public init(): void { 
        const model = this.workspace.getModel();
        if (model && doBenchmark) DataCache.getEngine(model.id).toggleCulling();
        this.workspace.finishPlugin();
    }

}