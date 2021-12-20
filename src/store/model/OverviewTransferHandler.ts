import { Overview } from "@/store/model/ModelAbstractData";
import { FolderOverviewEntry } from "./FileEngine";
import { OverviewEngine } from "../../components/workspace/OverviewEngine";
import { AbstractOverviewEntry } from "./OverviewData";

export class OverviewTransferHandler {

    private mapEngines: Map<number, OverviewEngine> = new Map();
    private hash: Map<number, AbstractOverviewEntry[]> = new Map();
    private static _instance = new OverviewTransferHandler();

    private constructor() {

    }

    static get instance() {
        return this._instance;
    }

    transferData(o: Overview) {
        let newArray: AbstractOverviewEntry[] | undefined = this.hash.get(o.id);
        if (newArray) {
            o.rootNodes = newArray;
        }
    }

    getData(id: number): AbstractOverviewEntry[] {
        let a = this.hash.get(id);
        if (!a) {
            a = [];
            this.hash.set(id, a);
        }
        return a;
    }
    setData(id: number, list: AbstractOverviewEntry[]): void {
        this.hash.set(id, list);
    }

    storeData(o: Overview) {
        if (!this.hash.has(o.id)) {
            let newArray: AbstractOverviewEntry[] = [];
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

