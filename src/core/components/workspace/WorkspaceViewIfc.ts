import AbstractWorkspaceEntry from "@/core/model/WorkspaceEntry";
import { ElementDimension } from "@/core/utils/resize";

export default interface WorkspaceViewIfc {
    getCoordinatesFromElement(e: any): ElementDimension;
    getPositionInDocument(e: { clientX: number; clientY: number }): { x: number, y: number };
    getPositionInWorkspace(e: { clientX: number; clientY: number }): { x: number, y: number };
    getLastMousePosition(): { x: number, y: number };
    getCurrentTransform(): { scale: number; x: number; y: number };
    getSelectionRectangle(): Element;
    getSelectedEntries(): HTMLElement[];
    getModelEntriesFromView(listViews: HTMLElement[]): AbstractWorkspaceEntry[];
    getModelEntries(): AbstractWorkspaceEntry[];
    getUnselectedEntries(): HTMLElement[];
    getEntries(): HTMLElement[];
    updateUI(): void;
    preventInput(prevent: boolean): void;
    updateSelectionWrapper(): void;
    showSelection(padding: number | undefined): void;
    drawCanvas(): void;
    dispatchEvent(e: Event): void;
    startPlugin(p: any): void;
    finishPlugin(): void;
    cancelPlugin(): void;
    showSelectionHighlighting: boolean;
    showNearbySelection: boolean;
}