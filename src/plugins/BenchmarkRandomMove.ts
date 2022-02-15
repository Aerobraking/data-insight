import { doBenchmark } from "@/core/utils/Benchmark";
import { PluginAdapter, PluginDecorator } from "../core/plugin/AbstractPlugin"
import { Instance as DataCache } from "@/core/model/overview/OverviewDataCache";
import { AbstractNode } from "@/core/model/overview/AbstractNode";

@PluginDecorator(doBenchmark)
export default class RandomNodeMovement extends PluginAdapter {

    readonly description: string = "<kbd>F2</kbd>";
    readonly name: string = "BENCH Random Node movement";
    readonly shortcut: string = "ov f2";

    constructor() { super(); }
    public isModal(): boolean {
        return false;
    }
    public init(): void {
        const model = this.workspace.getModel();
        if (model && doBenchmark) {
            DataCache.getEngine(model.id).shells.forEach(shell => {
                shell.customData["heat"] = { v: 100 };
                shell.nodes.forEach((n: AbstractNode) => {
                    const coord = n.customData["co"];
                    if (!n.isRoot() && coord != undefined) {
                        n.x += 1, n.y += 1;
                        coord.vy = Math.random() * 4000 - 2000, coord.vx = Math.random() * 200 - 100;
                    }
                });
            });
        }
        this.workspace.finishPlugin();
    }

}