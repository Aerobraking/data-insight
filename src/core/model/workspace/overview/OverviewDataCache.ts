import { OverviewEngine } from "@/core/components/overview/OverviewEngine";
import { Workspace } from "../Workspace";
import { AbstractNodeTree } from "./AbstractNodeTree";



export class OverviewTransferHandler {

    private mapEngines: Map<number, OverviewEngine> = new Map();
    private mapData: Map<number, AbstractNodeTree[]> = new Map();
    private static _instance = new OverviewTransferHandler();

    private constructor() {

    }

    static get instance() {
        return this._instance;
    }

    reset(){
        // this.mapEngines.forEach((value: OverviewEngine, key: number) => {
        //     value.dispose();
        // });
        this.mapData.clear();
        this.mapEngines.clear();
    }

    transferData(w: Workspace) {
        let newArray: AbstractNodeTree[] | undefined = this.mapData.get(w.id);
        if (newArray) {
            w.overview.trees = newArray;
        }
    }

    getData(obj: number | { workspace: Workspace }): AbstractNodeTree[] {
        let a = (typeof obj == 'number') ? this.mapData.get(obj) : this.mapData.get(obj.workspace.id);
        if (!a) {
            a = [];
            this.mapData.set((typeof obj == 'number') ? obj : obj.workspace.id, a);
        }
        return a;
    }
    setData(id: number, list: AbstractNodeTree[]): void {
        this.mapData.set(id, list);
    }

    storeData(w: Workspace) {
        if (!this.mapData.has(w.id)) {
            let newArray: AbstractNodeTree[] = [];
            newArray.push(...w.overview.trees);
            w.overview.trees = [];
            this.mapData.set(w.id, newArray);
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

