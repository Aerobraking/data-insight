import { OverviewEngine } from "@/components/app/OverviewEngine";
import { Workspace } from "../Workspace";
import { AbstractNodeShell } from "./AbstractNodeShell";

 

export class OverviewTransferHandler {

    private mapEngines: Map<number, OverviewEngine> = new Map();
    private hash: Map<number, AbstractNodeShell[]> = new Map();
    private static _instance = new OverviewTransferHandler();

    private constructor() {

    }

    static get instance() {
        return this._instance;
    }

    transferData(w: Workspace) {
        let newArray: AbstractNodeShell[] | undefined = this.hash.get(w.id);
        if (newArray) {
            w.overview.rootNodes = newArray;
        }
    }

    getData(id: number): AbstractNodeShell[] {
        let a = this.hash.get(id);
        if (!a) {
            a = [];
            this.hash.set(id, a);
        }
        return a;
    }
    setData(id: number, list: AbstractNodeShell[]): void {
        this.hash.set(id, list);
    }

    storeData(w: Workspace) {
        if (!this.hash.has(w.id)) {
            let newArray: AbstractNodeShell[] = [];
            newArray.push(...w.overview.rootNodes);
            w.overview.rootNodes = [];
            this.hash.set(w.id, newArray);
        }
    }

    createEngine(id: number, div: HTMLElement, ws: Workspace): Workspace {
        let overviewEngine = new OverviewEngine(
            div,
            ws
        );
        this.mapEngines.set(id, overviewEngine);
        return ws;
    }
    
    getEngine(id: number): OverviewEngine {
        let a = this.mapEngines.get(id);
        return a as OverviewEngine;
    }

}


export const Instance = OverviewTransferHandler.instance;

