import { FeatureType } from "@/core/model/workspace/overview/FeatureType";
import AbstractWorkspaceEntry from "@/core/model/workspace/WorkspaceEntry";
import { ElementDimension, getCoordinatesFromElement } from "@/core/utils/ResizeUtils";
import {
    onBeforeUnmount,
    onMounted,
    ref
} from "vue";
import WorkspaceViewIfc from "./WorkspaceViewIfc";

/**
 * The focus in our app is updated when the mouse is moved. In some situations we don't want that
 * for example when the focus is on a textfield. Use this method to test if a focus change is allowed.
 * @returns
 */
export function doChangeFocus(): boolean {
    return !(document.activeElement != undefined &&
        (document.activeElement instanceof HTMLInputElement ||
            (document.activeElement instanceof HTMLDivElement &&
                document.activeElement.contentEditable == "true")));
}

/**
 * The setup() method for the WorkspaceEntry Components. 
 * @param props
 * @param wsListener 
 * @returns 
 */
export function setupEntry(props: any, wsListener: WorkspaceViewListener | undefined = undefined) {

    const e: AbstractWorkspaceEntry = props.entry as AbstractWorkspaceEntry;

    // reference to the $el element
    const el: any = ref(null);

    let listener = {
        /**
         * Update the model coordinates (width,height,x,y) with the current ones from the html view.
         */
        prepareFileSaving(): void {
            let coords: ElementDimension = getCoordinatesFromElement(el.value);
            e.setDimensions(coords);
        }
    };

    /**
     * Register the WorkspaceViewListener when the component is mounted and set their dimension and position.
     * Because this data is not refreshes by the reactivity system of vue, we set it in the beginning and when
     * the file is saved we update it, see the prepareFileSaving() implementation above.
     */
    onMounted(() => {
        if (wsListener != undefined) {
            Events.registerCallback(wsListener);
        }
        Events.registerCallback(listener);

        if (el != null && el.value != null) {

            el.value.querySelectorAll("div.ws-entry .wsentry-displayname")
                .forEach((e: any) => {
                    e.classList.toggle("prevent-input", true);
                });

            el.value.style.transform = `translate3d(${e.x}px, ${e.y}px,0px)`;

            if (true || e.isResizable) {
                el.value.style.width = e.width + "px";
                el.value.style.height = e.height + "px";
            }
        }
    });
    onBeforeUnmount(() => {
        if (wsListener != undefined) {
            Events.unregisterCallback(wsListener);
        }
        Events.unregisterCallback(listener);
    });

    return { el };
}

/**
 * All WorkspaceEntry Components can use this interface to react to various
 * Events from the WorkspaceView. It can also be used to trigger Events in the WorkspaceView
 * by using the event() method. 
 */
export interface WorkspaceViewListener {

    /**
     * Is called when the string inside the searchfield changes.
     */
    searchEvent?: (value: string) => void;

    /**
     * Is called when the dragging of workspace entries starts.
     */
    dragStarting?: (selection: Element[], workspace: WorkspaceViewIfc) => void;

    /**
     * !Work in Progress!
     * Will be used to update the feature views inside the Workspace when settings are changed for
     * the feature visualization.
     */
    featureEvent?: (
        feature: FeatureType | undefined,
        min: number, max: number,
        getColor: (node: any, stat: number, min: number, max: number) => string) => void;

    /**
     * The state of our app is defined through the store object but there may be data that is not inside the
     * store while it is used in the app, mainly because of performance reasons (lots of updates in the store are slow
     * as hell). So before the file will be saved this method will be called and you can use it for updating 
     * the data in the store to current state. 
     */
    prepareFileSaving?: () => void;

    /**
     * Is called when the zoom value changes in the workpsace.
     */
    zoom?: (transform: { x: number, y: number, scale: number }, workspace: WorkspaceViewIfc) => void;

    /**
     * Is called when a plugin starts.
     * @param modal true: the plugin is modal, so all other inputs should be disabled.
     */
    pluginStarted?: (modal: boolean) => void;

    /**
     * Different things can be triggered by calling this method, see the type parameter.
     * @param type fixedZoomUpdate: Updates the elements in the active WorkspaceView that have a fixed scaling.
     */
    event?: (type: "fixedZoomUpdate") => void;
}

/**
 * This class is used for firing workspace events 
 */
export class Dispatcher {

    private static _instance = new Dispatcher();
    private constructor() { }

    static get instance() {
        return this._instance;
    }

    callbacks: WorkspaceViewListener[] = [];

    pluginStarted(modal: boolean): void {
        this.callbacks.forEach((c) => {
            if (c.pluginStarted) c.pluginStarted(modal);
        });
    }

    dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void {
        this.callbacks.forEach((c) => {
            if (c.dragStarting) c.dragStarting(selection, workspace);
        });
    }

    featureEvent(
        statAttribute: FeatureType,
        min: number, max: number,
        getColor: (node: any, stat: number, min: number, max: number) => string): void {
        this.callbacks.forEach((c) => {
            if (c.featureEvent) c.featureEvent(statAttribute, min, max, getColor);
        });
    }

    searchEvent(value: string): void {
        this.callbacks.forEach((c) => c.searchEvent ? c.searchEvent(value) : 0);
    }

    zoom(workspace: WorkspaceViewIfc): void {
        this.callbacks.forEach((c) => c.zoom ? c.zoom(workspace.getCurrentTransform(), workspace) : 0);
    }

    prepareFileSaving(): void {
        this.callbacks.forEach((c) => c.prepareFileSaving ? c.prepareFileSaving() : 0);
    }

    event(type: "fixedZoomUpdate"): void {
        this.callbacks.forEach((c) => c.event ? c.event(type) : 0);
    }

    registerCallback(callback: WorkspaceViewListener) {
        this.callbacks.push(callback);
    }

    unregisterCallback(callback: WorkspaceViewListener) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

}
export const Events = Dispatcher.instance;

/**
 * For copy and paste files inside our App we use this class. It simply
 * contains a list of strings which represent a list of paths.
 * One static instance of this class is used for it so the data can be 
 * used anywhere in the app. 
 */
class DIClipboard {

    private static _instance = new DIClipboard();
    private constructor() { }

    static get instance() {
        return this._instance;
    }

    public listFilesClipboard: string[] = [];
}

export const clipboard = DIClipboard.instance;

