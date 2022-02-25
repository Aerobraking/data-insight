import { Workspace } from '@/core/model/workspace/Workspace';
import { GetterTree } from 'vuex'
import { State } from './state'

export type Getters = {

  getShowUI(state: State): boolean
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
