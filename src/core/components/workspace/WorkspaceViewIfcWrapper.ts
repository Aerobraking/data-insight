import WorkspaceEntry from "@/core/model/WorkspaceEntry";
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
        return this.ws ? this.ws.getPositionInDocument(e) : { x: 0, y: 0 };
    }
    getPositionInDocument(e: { clientX: number; clientY: number }): {
        x: number;
        y: number;
    } {
        return this.ws ? this.ws.getPositionInDocument(e) : { x: 0, y: 0 };
    }
    getLastMousePosition(): { x: number, y: number } {
        return this.ws ? this.getLastMousePosition() : { x: 0, y: 0 };
    }
    getCurrentTransform(): { scale: number; x: number; y: number } {
        return this.ws ? this.ws.getCurrentTransform() : { scale: 0, x: 0, y: 0 };
    }
    getSelectionRectangle(): Element {
        return this.ws ? this.ws.getSelectionRectangle() : "" as unknown as Element;
    }
    getSelectedEntries(): HTMLElement[] {
        return this.ws ? this.ws.getSelectedEntries() : [];
    }
    getModelEntriesFromView(listViews: HTMLElement[]): WorkspaceEntry[] {
        return this.ws ? this.ws.getModelEntriesFromView(listViews) : [];
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
    drawCanvas(): void {
        this.ws ? this.ws.drawCanvas() : "";
    }
    finishPlugin(): void {
        this.ws ? this.ws.finishPlugin() : [];
    }
    updateUI(): void {
        this.ws ? this.ws.updateUI() : [];
    }
    preventInput(prevent: boolean): void {
        this.ws ? this.ws.preventInput(prevent) : [];
    }
    updateSelectionWrapper(): void {
        this.ws ? this.ws.updateSelectionWrapper() : [];
    }
    startPlugin(p: any): void {
        this.ws ? this.ws.startPlugin(p) : [];
    }
    dispatchEvent(e: Event): void {
        this.ws ? this.ws.dispatchEvent(e) : [];
    }
    cancelPlugin(): void {
        this.ws ? this.ws.cancelPlugin() : [];
    }
    showSelection(padding: number | undefined): void {
        this.ws ? this.ws.showSelection(padding) : [];
    }
    public set showSelectionHighlighting(val: boolean) {
        this.ws ? this.ws.showSelectionHighlighting = val : [];
    }
    public get showSelectionHighlighting(): boolean {
        return this.ws ? this.ws.showSelectionHighlighting : true;
    }
    public set showNearbySelection(val: boolean) {
        this.ws ? this.ws.showNearbySelection = val : [];
    }
    public get showNearbySelection(): boolean {
        return this.ws ? this.ws.showNearbySelection : true;
    }
}