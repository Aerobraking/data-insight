import { WorkspaceEntry } from "@/store/model/Workspace";
import { ElementDimension, getCoordinatesFromElement } from "@/utils/resize";
import {
    onBeforeUnmount,
    onMounted,
    ref
} from "vue";
import * as WSUtils from "./WorkspaceUtils";

export function setupEntry(props: any, wsListener: Listener | undefined = undefined) {
    
    const e: WorkspaceEntry = props.entry as WorkspaceEntry;

    // reference to the $el element
    const el: any = ref(null);

    let listener = {
        dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void { },
        /**
         * Update the model coordinates with the current ones from the html view.
         */
        prepareFileSaving(): void {

            let coords: ElementDimension = getCoordinatesFromElement(el.value);
            e.setDimensions(coords);
        },
        zoom(transform: { x: number, y: number, scale: number }, workspace: WorkspaceViewIfc): void {

        }
    };

    onMounted(() => {
        if (wsListener != undefined) {
            WSUtils.Events.registerCallback(wsListener);
        }
        WSUtils.Events.registerCallback(listener);

        if (true && el != null && el.value != null) {
            var text: HTMLInputElement = el.value.getElementsByClassName("wsentry-displayname")[0];

            if (text != undefined) {

                text.readOnly = true;

                const inputId = ref(e.displayname);
                text.value = inputId.value;

                text.addEventListener("mousedown", function (e: MouseEvent) {
                    //e.preventDefault();
                }, true);


                text.addEventListener("dblclick", function (e: MouseEvent) {
                    text.readOnly = false;
                    e.preventDefault();
                }, true);
                text.addEventListener("focusout", function (e: FocusEvent) {
                    text.readOnly = true;
                    e.preventDefault();
                }, true);

                el.value.appendChild(text);
            }
        }
    });
    onBeforeUnmount(() => {
        if (wsListener != undefined) {
            WSUtils.Events.unregisterCallback(wsListener);
        }
        WSUtils.Events.unregisterCallback(listener);
    });

    return { el };
}

export interface Listener {
    dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void;
    prepareFileSaving(): void;
    zoom(transform: { x: number, y: number, scale: number }, workspace: WorkspaceViewIfc): void;
}

export interface WorkspaceViewIfc {
    getCoordinatesFromElement(e: any): {
        x: number,
        y: number,
        w: number,
        h: number,
        x2: number,
        y2: number,
    };

    getCurrentTransform(): { scale: number; x: number; y: number };
    getSelectionRectangle(): Element;
    getSelectedEntries(): HTMLElement[];
    getEntries(): HTMLElement[];
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


export class Dispatcher {


    private static _instance = new Dispatcher();
    private constructor() { }

    static get instance() {
        return this._instance;
    }

    callbacks: Listener[] = [];

    dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void {
        this.callbacks.forEach((c) => {
            c.dragStarting(selection, workspace);
        });
    }
    zoom(workspace: WorkspaceViewIfc): void {
        this.callbacks.forEach((c) => {
            c.zoom(workspace.getCurrentTransform(), workspace);
        });
    }
    prepareFileSaving(): void {
        this.callbacks.forEach((c) => {
            c.prepareFileSaving();
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

