import { OverviewEngine } from "@/core/components/overview/OverviewEngine";
import { Workspace } from "../Workspace";
import { AbstractNodeTree } from "./AbstractNodeTree";

/**
 * The Data of the Overview (The Trees with their nodes) is not updated by the 
 * Reactivity of Vue because that is waaaay to slow for >100 nodes. So when
 * an InsightFile Object is loaded or a new Overview is created, the data is
 * transfered to this handler and removed from the overviews itself, before the 
 * Reactivity in Vue starts working.
 * When the current InsightFile is saved, the data is transfered back to the overview for the time 
 * of the saving.
 * This class also creates and returns the OverviewEngines Instances for each Overview.
 * 
 * So when working with the overview data and its visualization, you always have to get these from
 * this handler class Instance.
 */
export class OverviewTransferHandler {

    private mapEngines: Map<number, OverviewEngine> = new Map();
    private mapData: Map<number, AbstractNodeTree[]> = new Map();
    private static _instance = new OverviewTransferHandler();

    private constructor() { }

    static get instance() {
        return this._instance;
    }

    /**
     * Clears all the cached overview data. Should be called when a new InsightFile is loaded.
     */
    reset() {
        this.mapData.clear();
        this.mapEngines.clear();
    }

    /**
     * Transfers the data of the overview into our handler and removes it from the overview afterwards.
     * @param w The workspace with the overview data.
     */
    storeData(w: Workspace) {
        if (!this.mapData.has(w.id)) {
            let newArray: AbstractNodeTree[] = [];
            newArray.push(...w.overview.trees);
            w.overview.trees = [];
            this.mapData.set(w.id, newArray);
        }
    }

    /**
     * Transfers the data of the overview back to the overview object. 
     * @param w The workspace with the overview data.
     */
    restoreData(w: Workspace) {
        let newArray: AbstractNodeTree[] | undefined = this.mapData.get(w.id);
        if (newArray) {
            w.overview.trees = newArray;
        }
    }

    /**
     * Returns the data of the overview for the given Workspace.
     * @param obj The ID of the Workspace or the Workspace Object itself.
     * @returns The List of AbstractNodeTree of the overview.
     */
    getData(obj: number | { workspace: Workspace }): AbstractNodeTree[] {
        let a = (typeof obj == 'number') ? this.mapData.get(obj) : this.mapData.get(obj.workspace.id);
        if (!a) {
            a = [];
            this.mapData.set((typeof obj == 'number') ? obj : obj.workspace.id, a);
        }
        return a;
    }

    /**
     * Stores the given data for the given overview. Overwrites any data that is already stored
     * for the overview.
     * @param id The id for the Workspace of the overview.
     * @param list The data to store for the given overview.
     */
    setData(id: number, list: AbstractNodeTree[]): void {
        this.mapData.set(id, list);
    }

    /**
     * Creates an OverviewEngine Instance for the given Workspace Instance. Should only
     * be called once for a loaded Workspace.
     * @param id The id of the workspace
     * @param div The HTMLElement which should includes the Canvas of the OverviewEngine
     * @param ws The workspace instance.
     * @returns the workspace instance that was passed as a parameter.
     */
    createEngine(id: number, div: HTMLElement, ws: Workspace): Workspace {
        let overviewEngine = new OverviewEngine(div, ws);
        this.mapEngines.set(id, overviewEngine);
        return ws;
    }

    /**
     * Returns the OverviewEngine Instance for the given workspace. Beware, it 
     * assumes an OverviewEngine Instance exists so make sure createEngine() was called for 
     * the workspace.
     * @param id 
     * @returns 
     */
    getEngine(id: number | { workspace: Workspace }): OverviewEngine {
        if (typeof id == 'number') return this.mapEngines.get(id) as OverviewEngine;
        else return this.mapEngines.get(id.workspace.id) as OverviewEngine;
    }
}

export const Instance = OverviewTransferHandler.instance;

