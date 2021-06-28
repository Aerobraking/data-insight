import { MutationTree } from 'vuex'
import { MutationTypes } from './mutation-types'
import { State } from '../state'
import { View, Workspace, Overview, WorkspaceEntryFile, WorkspaceEntry } from '../model/DataModel'

export type Mutations<S = State> = {
  // als key für die methode nehmen wir die einzelnen enum types. und da wir die method eh nicht direkt aurufen ala setCounter() sondern per commit("setCounter", parameter ...)
  // haben wir dann einfach das enum anstelle des strings commit(MutationTypes.SET_COUNTER,parameter ...) 
  [MutationTypes.SET_COUNTER](state: S, payload: number): void
  [MutationTypes.RESET_COUNTER](state: S, payload: number): void
  [MutationTypes.CREATE_WORKSPACE](state: S): void
  [MutationTypes.CREATE_OVERVIEW](state: S): void
  [MutationTypes.ADD_FILES](state: S, payload: {
    model: Workspace,
    listFiles: Array<WorkspaceEntry>,
  }): void
}

/**
 * Implementiert unser type (interface), hier haben wir dann also den code für jede methode die wir definiert haben im type.
 */
export const mutations: MutationTree<State> & Mutations = {
  [MutationTypes.SET_COUNTER](state, payload: number) {
    state.counter = payload
  },

  [MutationTypes.RESET_COUNTER](state, payload: number) {
    state.counter = payload
  },

  [MutationTypes.ADD_FILES](state, payload: {
    model: Workspace,
    listFiles: Array<WorkspaceEntry>,
  }) {
    payload.model.entries.push(...payload.listFiles);
  },

  [MutationTypes.CREATE_WORKSPACE](state) {
    state.views.push(new Workspace());
    let lastIndex = state.views.length - 1;
    state.selectedViewIndex = lastIndex;
    state.views.forEach(
      (entry: View, index: Number) => {
        entry.isActive = index === lastIndex;
      }
    );
  },

  [MutationTypes.CREATE_OVERVIEW](state) {
    state.views.push(new Overview());
    let lastIndex = state.views.length - 1;
    state.selectedViewIndex = lastIndex;
    state.views.forEach(
      (entry: View, index: Number) => {
        entry.isActive = index === lastIndex;
      }
    );
  },
}

