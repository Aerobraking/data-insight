import { Overview } from "@/store/model/OverviewDataModel";
import { FolderOverviewEntry } from "./FileEngine";
import { OverviewEngine } from "./OverviewEngine";

export class OverviewTransferHandler {

    private mapEngines: Map<number, OverviewEngine> = new Map();
    private hash: Map<number, FolderOverviewEntry[]> = new Map();
    private static _instance = new OverviewTransferHandler();

    private constructor() {

    }

    static get instance() {
        return this._instance;
    }

    transferData(o: Overview) {
        let newArray: FolderOverviewEntry[] | undefined = this.hash.get(o.id);
        if (newArray) {
            o.rootNodes = newArray;
        }
    }

    getData(id: number): FolderOverviewEntry[] {
        let a = this.hash.get(id);
        if (!a) {
            a = [];
            this.hash.set(id, a);
        }
        return a;
    }
    setData(id: number, list: FolderOverviewEntry[]): void {
        this.hash.set(id, list);
    }

    storeData(o: Overview) {
        if (!this.hash.has(o.id)) {
            let newArray: FolderOverviewEntry[] = [];
            newArray.push(...o.rootNodes);
            o.rootNodes = [];
            this.hash.set(o.id, newArray);
        }
    }

    createEngine(id: number, div: HTMLElement, overview: Overview): Overview {
        let overviewEngine = new OverviewEngine(
            div,
            overview
        );
        this.mapEngines.set(id, overviewEngine);
        return overview;
    }
    getEngine(id: number): OverviewEngine {
        let a = this.mapEngines.get(id);
        return a as OverviewEngine;
    }

}


export const Instance = OverviewTransferHandler.instance;

