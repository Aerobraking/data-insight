import { GetterTree } from 'vuex'
import { Overview } from './model/OverviewDataModel'
import { Workspace } from './model/Workspace'
import { State } from './state'

export type Getters = {

  getShowUI(state: State):boolean
  getViewList(state: State): Array<Workspace>
  getActiveWorkspaceIndex(state: State): number
}

export const getters: GetterTree<State, State> & Getters = {

  getShowUI: (state) => {
    return state.loadedFile.settings.showUI;
  },

  getViewList: (state) => {
    return state.loadedFile.views;
  },
  getActiveWorkspaceIndex: (state) => {
    let activeindex = state.loadedFile.views.findIndex(x => x.isActive);
    return activeindex;
  },
}
