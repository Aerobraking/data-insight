import { MutationTree } from 'vuex'
import { MutationTypes } from './mutation-types'
import { InsightFile, State } from '../state'
import { View } from '../model/DataModel'
import { Overview } from '../model/OverviewDataModel'
import { Workspace, WorkspaceEntry } from '../model/Workspace'

export type Mutations<S = State> = {
  // als key für die methode nehmen wir die einzelnen enum types. und da wir die method eh nicht direkt aurufen ala setCounter() sondern per commit("setCounter", parameter ...)
  // haben wir dann einfach das enum anstelle des strings commit(MutationTypes.SET_COUNTER,parameter ...) 

  [MutationTypes.CREATE_WORKSPACE](state: S): void
  [MutationTypes.CREATE_OVERVIEW](state: S): void
  [MutationTypes.ADD_FILES](state: S, payload: {
    model: Workspace,
    listFiles: Array<WorkspaceEntry>,
  }): void
  [MutationTypes.LOAD_FILE](state: S, payload: {
    insightFile: InsightFile
  }): void
}

/**
 * Implementiert unser type (interface), hier haben wir dann also den code für jede methode die wir definiert haben im type.
 */
export const mutations: MutationTree<State> & Mutations = {

  [MutationTypes.ADD_FILES](state, payload: {
    model: Workspace,
    listFiles: Array<WorkspaceEntry>,
  }) {
    payload.model.entries.push(...payload.listFiles);
  },
  [MutationTypes.LOAD_FILE](state, payload: {
    insightFile: InsightFile
  }) {
    state.loadedFile = payload.insightFile;
  },

  [MutationTypes.CREATE_WORKSPACE](state) {
    state.loadedFile.views.push(new Workspace());
    let lastIndex = state.loadedFile.views.length - 1;
    state.loadedFile.selectedViewIndex = lastIndex;
    state.loadedFile.views.forEach(
      (entry: View, index: Number) => {
        entry.isActive = index === lastIndex;
      }
    );
  },

  [MutationTypes.CREATE_OVERVIEW](state) {
    state.loadedFile.views.push(new Overview());
    let lastIndex = state.loadedFile.views.length - 1;
    state.loadedFile.selectedViewIndex = lastIndex;
    state.loadedFile.views.forEach(
      (entry: View, index: Number) => {
        entry.isActive = index === lastIndex;
      }
    );
  },
}

