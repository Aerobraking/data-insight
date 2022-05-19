import { FileActivity } from "@/core/model/fileactivity/FileActivity";
import AbstractWorkspaceEntry from "@/core/model/fileactivity/workspace/WorkspaceEntry";
import { ElementDimension } from "@/core/utils/ResizeUtils";
import AbstractPlugin from "../plugin/AbstractPlugin";

/**
 * This interface offers you various data from the WorkspaceView and you can also
 * trigger some Events in the WorkspaceView. All WorkspaceEntry Components are getting
 * this Interface for the WorkspaceView there are in.
 */
export default interface WorkspaceViewIfc {
    /**
     * Returns the Workspace Model Object that the View uses.
     */
    getModel(): FileActivity | undefined;
    /**
     * 
     * @param e A HTMLElement for which the Dimensions are returned.
     * @returns The ElementDimension for the given HTMLElement.
     */
    getCoordinatesFromElement(e: HTMLElement): ElementDimension;
    /**
     * Converts the given Position in the Workspace to the position in the HTML Document.
     * @param e MousePosition in the Workspace
     * @returns The MousePosition relative to the HTML Document, which is basically the position relative
     * to the window of the app.
     */
    getPositionInDocument(e: { clientX: number; clientY: number }): { x: number, y: number };
    /**
     * Converts the given Position in the HTML Document to the position in the Workspace.
     * @param e MousePosition in the HTML Document
     * @returnsThe MousePosition relative to the Workspace.
     */
    getPositionInWorkspace(e: { clientX: number; clientY: number }): { x: number, y: number };
    /**
     * @returns The last MousePosition relative to the workspace.
     */
    getLastMousePosition(): { x: number, y: number };
    /**
     * @returns The current viewport transformation of the workspace.
     */
    getCurrentTransform(): { scale: number; x: number; y: number };
    /**
     * @returns Returns the HTML DIV Element that represents the selection rectangle which wraps around
     * all selected WorkspaceEntry Views.
     */
    getSelectionRectangle(): Element;
    /**
     * @returns The List of all selected WorkspaceEntry Components, that are all 
     * represented as an HTMLElement. 
     */
    getSelectedEntries(): HTMLElement[];
    /**
     * @param listViews List of WorkspaceEntry Views, for which the list of Model Objects are returned.
     * @returns The list of WorkspaceEntry Model Objects, in the same order as their given views.
     */
    getModelEntriesFromView(listViews: HTMLElement[]): AbstractWorkspaceEntry[];
    /**
     * @returns The list of all WorkspaceEntry Model Objects that belong to the Workspace Model of this
     * WorkspaceView.
     */
    getModelEntries(): AbstractWorkspaceEntry[];
    /**
     * @returns The List of all unselected WorkspaceEntry Components, that are all 
     * represented as an HTMLElement. 
     */
    getUnselectedEntries(): HTMLElement[];
    /**
     * @returns The list of all WorkspaceEntry Views inside the WorkspaceView.
     */
    getEntries(): HTMLElement[];
    /**
     * Updates all UI Elements inside the WorkspaceView like the selection hightlighting etc. 
     */
    updateUI(): void;
    /**
     * Updates (draws) the Canvas in the WorkspaceView which is responsible for highlighting the
     * selected WorkspaceEntry Views. 
     */
    drawCanvas(): void;
    /**
     * Updates the HTMLDIVElements which wraps all selected WorkspaceEntry Views.
     */
    updateSelectionWrapper(): void;
    /**
     * 
     * @param prevent true: prevents Input for all events on all WorkspaceEntry Views in the WorkspaceView.
     * false: Input Events are enabled for all WorkspaceEntry Views in the WorkspaceView.
     */
    preventInput(prevent: boolean): void;
    /**
     * 
     * @param padding true: the selected WorkspaceEntry Views are highlighted.
     * false: the selected WorkspaceEntry Views are NOT highlighted.
     */
    showSelection(padding: number | undefined): void;
    /**
     * You can pass eny kind of Input Event to the WorkspaceView with this method.
     * @param e The event that will be dispatched to the WorkspaceView.
     */
    dispatchEvent(e: Event): void;
    /**
     * Starts the given Plugin 
     * @param p The Plugin that you want to start.
     */
    startPlugin(p: AbstractPlugin): void;
    /**
     * Calls the finish() Method on the current active Plugin.
     * When no Plugin is active, nothing is done.
     */
    finishPlugin(): void;
    /**
    * Calls the cancel() Method on the current active Plugin.
    * When no Plugin is active, nothing is done.
    */
    cancelPlugin(): void;
    /**
     * true: selected entries are highlighted with a blue border.
     * false: the highlighting is disabled
     */
    showSelectionHighlighting: boolean;
    /**
     * true: When the mouse is close to entries, the closest entry is highlighted
     * false: the highlighting is disabled 
     */
    showNearbySelection: boolean;
}