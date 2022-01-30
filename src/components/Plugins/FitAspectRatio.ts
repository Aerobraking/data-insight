
import WorkspaceEntryAspectRatio from "@/store/model/app/WorkspaceEntry";
import AbstractPlugin, { PluginAdapter, PluginDecorator } from "../app/plugins/AbstractPlugin"

@PluginDecorator()
export default class FitAspectRatio extends PluginAdapter {


    readonly description: string = "<kbd>A</kbd>";
    readonly name: string = "Fit Aspect Ratio";
    readonly shortcut: string = "ws a";

    constructor() {
        super();
    }

    public init(): void {
        const views = this.workspace.getSelectedEntries();
        const models = this.workspace.getModelEntriesFromView(views);

        for (let i = 0; i < models.length; i++) {
            const m = models[i];
            const v = views[i];

            if (m instanceof WorkspaceEntryAspectRatio) {
                if (m.aspectratio) {
                    let w = Number(v.offsetWidth);
                    v.style.width = w + "px";
                    v.style.height = w * m.aspectratio.ratio + "px";
                }
            }
        }
        this.workspace.updateUI();
        this.workspace.finishPlugin();
    }



}