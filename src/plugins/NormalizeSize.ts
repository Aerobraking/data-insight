import { ElementDimension, setSize } from "@/core/utils/ResizeUtils";
import { PluginAdapter, PluginDecorator } from "@/core/plugin/AbstractPlugin"

@PluginDecorator(true)
export default class PluginNormalizeSize extends PluginAdapter {

    readonly description: string = "<kbd>N</kbd>";
    readonly name: string = "Normalize Size";
    readonly shortcut: string = "ws n";

    constructor() { super(); }

    public init(): void {

        const views = this.workspace.getSelectedEntries();
        /**
          *   set size from the average width of all elements.
          */
        let sum = 0;
        for (let index = 0; index < views.length; index++) {
            const e = views[index];
            let d: ElementDimension = this.workspace.getCoordinatesFromElement(e);
            sum += d.w;
        }

        const averageWidth = (sum / views.length) || 200;

        for (let index = 0; index < views.length; index++) {
            const e = views[index];
            let d: ElementDimension = this.workspace.getCoordinatesFromElement(e);
            setSize(e, averageWidth, d.h * (averageWidth / d.w));
        }

        this.workspace.updateUI();
        this.workspace.finishPlugin();
    }

}