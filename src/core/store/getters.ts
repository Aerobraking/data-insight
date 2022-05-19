import { GetterTree } from 'vuex'
import AbstractActivity from '../model/AbstractActivity';
import { State } from './state'

export type Getters = {
  getShowUI(state: State): boolean
  getViewList(state: State): Array<AbstractActivity>
  getActiveWorkspaceIndex(state: State): number
}

export const getters: GetterTree<State, State> & Getters = {
  
  /**
   * Returns the showUI boolean of the current InsightFile
   * @param state 
   * @returns true: show normal UI, false: hide certain UI Elements for distract free mode.
   */
  getShowUI: (state) => {
    return state.loadedFile.settings.showUI;
  },

  /**
   * 
   * @param state 
   * @returns list of Views of the current InsightFile.
   */
  getViewList: (state) => {
    return state.loadedFile.views;
  },

  /**
   * 
   * @param state 
   * @returns index of the active workspace
   */
  getActiveWorkspaceIndex: (state) => {
    let activeindex = state.loadedFile.views.findIndex(x => x.isActive);
    return activeindex;
  },
}
