import { GetterTree } from 'vuex'
import { Overview, StartScreen, Workspace } from './model/DataModel'
import { State } from './state'

export type Getters = {
  doubledCounter(state: State): number
  getViewList(state: State): Array<Workspace|Overview|StartScreen>
}

export const getters: GetterTree<State, State> & Getters = {
  doubledCounter: (state) => {
    return state.counter * 2
  },
  getViewList: (state) => {
    return state.views;
  },
}
