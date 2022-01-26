import WorkspaceEntry from "@/store/model/app/WorkspaceEntry";
import { ElementDimension } from "@/utils/resize";

export default interface WorkspaceViewIfc {
    getCoordinatesFromElement(e: any): ElementDimension;
    getPositionInDocument(e: { clientX: number; clientY: number }): { x: number, y: number };
    getPositionInWorkspace(e: { clientX: number; clientY: number }): { x: number, y: number };
    getCurrentTransform(): { scale: number; x: number; y: number };
    getSelectionRectangle(): Element;
    getSelectedEntries(): HTMLElement[];
    getModelEntries(): WorkspaceEntry[];
    getUnselectedEntries(): HTMLElement[];
    getEntries(): HTMLElement[];
    finishPlugin(): void;
    preventInput(prevent: boolean): void;
    highlightSelection: boolean;
    updateSelectionWrapper(): void;
    startPlugin(p: any): void;
    showSelection(padding: number | undefined): void;
    finishPlugin(): void;
    dispatchEvent(e: Event): void;
    cancelPlugin(): void;
}