import { Overview } from "@/store/model/OverviewDataModel";
import { FolderOverviewEntry } from "./FileEngine";

export class OverviewTransferHandler {

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

    getData(id: number): FolderOverviewEntry[]  {
        let a= this.hash.get(id);
        if (!a) {
            a = [];
            this.hash.set(id,a);
        }
        return a;
    }

    storeData(o: Overview) {
        let newArray: FolderOverviewEntry[] = [];
        newArray.push(...o.rootNodes);
        o.rootNodes = [];
        this.hash.set(o.id, newArray);
        console.log("stored: "+o.id);
        
    }

}


export const Instance = OverviewTransferHandler.instance;

