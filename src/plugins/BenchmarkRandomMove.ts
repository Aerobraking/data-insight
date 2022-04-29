import { doBenchmark } from "@/core/utils/Benchmark";
import { PluginAdapter, PluginDecorator } from "../core/plugin/AbstractPlugin"
import { Instance as DataCache } from "@/core/model/workspace/overview/OverviewDataCache";
import { AbstractNode } from "@/core/model/workspace/overview/AbstractNode";

/**
 * Only usable in the App when benchmarking is enabled. 
 * Adds random movement to all nodes in the visible overview.
 */
@PluginDecorator(doBenchmark)
export default class RandomNodeMovement extends PluginAdapter {

    readonly description: string = "<kbd>F2</kbd>";
    readonly name: string = "BENCH Random Node movement";
    readonly shortcut: string = "ov f2";
    readonly domain = "ov";

    constructor() { super(); }
    public isModal(): boolean {
        return false;
    }
    public init(): void {
        const model = this.workspace.getModel();
        if (model && doBenchmark) {
            DataCache.getEngine(model.id).trees.forEach(tree => {
                tree.customData["heat"] = { v: 100 };
                tree.nodes.forEach((n: AbstractNode) => {
                    const coord = n.customData["co"];
                    if (!n.isRoot() && coord != undefined) {
                        // n.x += 1, n.y += 1;
                        n.x += 1, n.y = 0;
                        // coord.vy = Math.random() * 4000 - 2000, coord.vx = Math.random() * 200 - 100;
                        n.x = Math.random() * 10000 - 5000
                        n.y = Math.random() * 10000 - 5000,
                            coord.vy = 0;
                        coord.vx = 0;

                    }
                });
            });
        }
        this.workspace.finishPlugin();
    }

}