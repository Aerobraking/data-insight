import { Overview } from "./model/OverviewDataModel"
import { Workspace } from "./model/Workspace"

 


export const state: {
    counter: number,
    views: Array<Workspace | Overview>,
    selectedViewIndex: number
} = {
    counter: 0,
    views: [
       
    ],
    selectedViewIndex: 0
}
export type State = typeof state
