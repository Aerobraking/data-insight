export class Huhu {

    private static _instance = new Huhu();
    private constructor() {

    }
    static get instance() {
        return this._instance;
    }
}




const Ss: Huhu = {

};


export const foo = Huhu.instance;




import { WorkspaceEntry } from "@/store/model/Workspace";


export interface Listener {
    dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void;
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

    getSelectionRectangle(): Element;
    getSelectedEntries(): HTMLCollectionOf<Element>;
    getEntries(): HTMLCollectionOf<Element>;
}

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

export function insideRect(
    r1: { x: number; y: number; x2: number; y2: number },
    r2: { x: number; y: number; x2: number; y2: number } // inside
) {
    let a: boolean = r2.x > r1.x2;
    let b: boolean = r2.x2 < r1.x;
    let c: boolean = r2.y > r1.y2;
    let d: boolean = r2.y2 < r1.y;

    return r2.x2 < r1.x2 && r2.x > r1.x && r2.y > r1.y && r2.y2 < r1.y2;
}


export class Dispatcher {


    private static _instance = new Dispatcher();
    private constructor() {

    }
    static get instance() {
        return this._instance;
    }


    test(): void {

    }

    callbacks: Listener[] = [];

    dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void {
        this.callbacks.forEach((c) => {
            c.dragStarting(selection, workspace);
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

