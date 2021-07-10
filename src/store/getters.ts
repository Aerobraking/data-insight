import { GetterTree } from 'vuex' 
import { Overview } from './model/OverviewDataModel'
import { Workspace } from './model/Workspace'
import { State } from './state'

export type Getters = {
  doubledCounter(state: State): number
  getViewList(state: State): Array<Workspace|Overview>
}

export const getters: GetterTree<State, State> & Getters = {
  doubledCounter: (state) => {
    return state.counter * 2
  },
  getViewList: (state) => {
    return state.views;
  },
}
