import { GetterTree } from 'vuex'
import { Overview } from './model/OverviewDataModel'
import { Workspace } from './model/Workspace'
import { State } from './state'

export type Getters = {

  getViewList(state: State): Array<Workspace | Overview>
}

export const getters: GetterTree<State, State> & Getters = {

  getViewList: (state) => {
    return state.loadedFile.views;
  },
}
