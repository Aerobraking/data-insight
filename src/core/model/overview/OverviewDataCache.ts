import { OverviewEngine } from "@/core/components/workspace/OverviewEngine";
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

    getData(id: number | { workspace: Workspace }): AbstractNodeShell[] {
        let a = (typeof id == 'number') ? this.hash.get(id) : this.hash.get(id.workspace.id);
        if (!a) {
            a = [];
            this.hash.set((typeof id == 'number') ? id : id.workspace.id, a);
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

    getEngine(id: number | { workspace: Workspace }): OverviewEngine {
        if (typeof id == 'number') return this.mapEngines.get(id) as OverviewEngine;
        else return this.mapEngines.get(id.workspace.id) as OverviewEngine;
    }
}


export const Instance = OverviewTransferHandler.instance;

