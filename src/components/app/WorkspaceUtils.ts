import { Feature } from "@/store/model/app/overview/AbstractNodeFeature";
import WorkspaceEntry from "@/store/model/app/WorkspaceEntry";
import { ElementDimension, getCoordinatesFromElement } from "@/utils/resize";
import {
    onBeforeUnmount,
    onMounted,
    ref
} from "vue";
import WorkspaceViewIfc from "./WorkspaceViewIfc";

export function doChangeFocus(): boolean {
    return !(document.activeElement != undefined &&
        (document.activeElement instanceof HTMLInputElement ||
            (document.activeElement instanceof HTMLDivElement &&
                document.activeElement.contentEditable == "true")));
}

export function setupEntry(props: any, wsListener: Listener | undefined = undefined) {

    const e: WorkspaceEntry = props.entry as WorkspaceEntry;

    // reference to the $el element
    const el: any = ref(null);

    let listener = {
        /**
         * Update the model coordinates with the current ones from the html view.
         */
        prepareFileSaving(): void {
            let coords: ElementDimension = getCoordinatesFromElement(el.value);
            e.setDimensions(coords);
        }
    };

    onMounted(() => {
        if (wsListener != undefined) {
            Events.registerCallback(wsListener);
        }
        Events.registerCallback(listener);

        console.log("onmounted");

        if (el != null && el.value != null) {
            console.log("1");

            el.value.querySelectorAll("div.ws-entry .wsentry-displayname")
                .forEach((e: any) => {
                    e.classList.toggle("prevent-input", true);
                });

            el.value.style.transform = `translate3d(${e.x}px, ${e.y}px,0px)`;

            if (true || e.isResizable) {
                console.log("size");

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
 * 
 * @param r1 rectangle that is tested to be inside r2
 * @param r2 
 * @returns true if r1 is completly inside r2
 */
export function intersectRect(
    r1: { x: number; y: number; x2: number; y2: number },
    r2: { x: number; y: number; x2: number; y2: number }
) {
    let a: boolean = r2.x > r1.x2;
    let b: boolean = r2.x2 < r1.x;
    let c: boolean = r2.y > r1.y2;
    let d: boolean = r2.y2 < r1.y;

    return !(r2.x > r1.x2 || r2.x2 < r1.x || r2.y > r1.y2 || r2.y2 < r1.y);
}

/**
 * Tests if r2 is inside r1
 * @param r1 
 * @param r2 
 * @returns 
 */
export function insideRect(
    r1: { x: number; y: number; x2: number; y2: number }, // the outside one
    r2: { x: number; y: number; x2: number; y2: number } // the inside one
) {
    let a: boolean = r2.x > r1.x2;
    let b: boolean = r2.x2 < r1.x;
    let c: boolean = r2.y > r1.y2;
    let d: boolean = r2.y2 < r1.y;

    return r2.x2 < r1.x2 && r2.x > r1.x && r2.y > r1.y && r2.y2 < r1.y2;
}

export interface Listener {
    searchEvent?: (value: string) => void;
    dragStarting?: (selection: Element[], workspace: WorkspaceViewIfc) => void;

    featureEvent?: (
        feature: Feature | undefined,
        min: number, max: number,
        getColor: (node: any, stat: number, min: number, max: number) => string) => void;

    prepareFileSaving?: () => void;
    zoom?: (transform: { x: number, y: number, scale: number }, workspace: WorkspaceViewIfc) => void;
    pluginStarted?: (modal: boolean) => void;
    event?: (type: "fixedZoomUpdate") => void;
}

export class Dispatcher {

    private static _instance = new Dispatcher();
    private constructor() { }

    static get instance() {
        return this._instance;
    }

    callbacks: Listener[] = [];

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
        statAttribute: Feature,
        min: number, max: number,
        getColor: (node: any, stat: number, min: number, max: number) => string): void {
        this.callbacks.forEach((c) => {
            if (c.featureEvent) c.featureEvent(statAttribute, min, max, getColor);
        });
    }

    searchEvent(value: string): void {
        this.callbacks.forEach((c) => {
            if (c.searchEvent) c.searchEvent(value);
        });
    }

    zoom(workspace: WorkspaceViewIfc): void {
        this.callbacks.forEach((c) => {
            if (c.zoom) c.zoom(workspace.getCurrentTransform(), workspace);
        });
    }

    prepareFileSaving(): void {
        this.callbacks.forEach((c) => {
            if (c.prepareFileSaving) c.prepareFileSaving();
        });
    }

    event(type: "fixedZoomUpdate"): void {
        this.callbacks.forEach((c) => {
            if (c.event) c.event(type);
        });
    }

    registerCallback(callback: Listener) {
        this.callbacks.push(callback);
    }

    unregisterCallback(callback: Listener) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

}
export const Events = Dispatcher.instance;

export class DIClipboard {

    private static _instance = new DIClipboard();
    private constructor() { }

    static get instance() {
        return this._instance;
    }

    public listFilesClipboard: string[] = [];
}

export const clipboard = DIClipboard.instance;

