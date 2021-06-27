import { Workspace, Overview, StartScreen } from "./model/DataModel";


export const state: {
    counter: number,
    views: Array<Workspace | Overview | StartScreen>,
    selectedViewIndex: number
} = {
    counter: 0,
    views: [
       
    ],
    selectedViewIndex: 0
}
export type State = typeof state
