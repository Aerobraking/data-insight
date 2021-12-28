import WorkspaceEntry from "@/store/model/WorkspaceEntry";
import { ElementDimension } from "@/utils/resize";
import WorkspaceViewIfc from "./WorkspaceViewIfc";

export default class WorkspaceViewIfcWrapper implements WorkspaceViewIfc {
    ws: (WorkspaceViewIfc | undefined) = undefined;
    getCoordinatesFromElement(e: any): ElementDimension {
        return this.ws ? this.ws.getCoordinatesFromElement(e) :
            "" as unknown as ElementDimension;
    }
    getPositionInWorkspace(e: { clientX: number; clientY: number }): {
        x: number;
        y: number;
    } {
        return { x: 0, y: 0 };
    }
    getCurrentTransform(): { scale: number; x: number; y: number } {
        return { scale: 0, x: 0, y: 0 };
    }
    getSelectionRectangle(): Element {
        return "" as unknown as Element;
    }
    getSelectedEntries(): HTMLElement[] {
        return this.ws ? this.ws.getSelectedEntries() : [];
    }
    getModelEntries(): WorkspaceEntry[] {
        return this.ws ? this.ws.getModelEntries() : [];
    }
    getUnselectedEntries(): HTMLElement[] {
        return this.ws ? this.ws.getUnselectedEntries() : [];
    }
    getEntries(): HTMLElement[] {
        return this.ws ? this.ws.getEntries() : [];
    }
    finishPlugin(): void { }
    preventInput(prevent: boolean): void { }


    public set highlightSelection(val: boolean) {
        this.ws ? this.ws.highlightSelection = val : [];
    }

    public get highlightSelection(): boolean {
        return this.ws ? this.ws.highlightSelection : true;
    }

    updateSelectionWrapper(): void { }
    startPlugin(p: any): void { }
    dispatchEvent(e: Event): void { }
    cancelPlugin(): void { }
}