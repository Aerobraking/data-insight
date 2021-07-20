import { Overview } from "./model/OverviewDataModel"
import { Workspace } from "./model/Workspace"


export type InsightFile = {
    views: Array<Workspace | Overview>,
    selectedViewIndex: number
}

export const state: {
    // views: Array<Workspace | Overview>,
    // selectedViewIndex: number,
    loadedFile: InsightFile
} = {
    // views: [

    // ],
    // selectedViewIndex: 0,
    loadedFile: {
        views: [

        ],
        selectedViewIndex: 0
    }
}
export type State = typeof state
