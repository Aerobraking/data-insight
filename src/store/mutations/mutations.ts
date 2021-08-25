import { MutationTree } from 'vuex'
import { MutationTypes } from './mutation-types'
import { InsightFile, State } from '../state'
import { View } from '../model/DataModel'
import { Overview } from '../model/OverviewDataModel'
import { Workspace, WorkspaceEntry } from '../model/Workspace'

var entrycounter = 0;

export type Mutations<S = State> = {
  // als key für die methode nehmen wir die einzelnen enum types. und da wir die method eh nicht direkt aurufen ala setCounter() sondern per commit("setCounter", parameter ...)
  // haben wir dann einfach das enum anstelle des strings commit(MutationTypes.SET_COUNTER,parameter ...) 

  [MutationTypes.CREATE_WORKSPACE](state: S): void
  [MutationTypes.CREATE_OVERVIEW](state: S): void
  [MutationTypes.ADD_FILES](state: S, payload: {
    model: Workspace,
    listFiles: Array<WorkspaceEntry>,
  }): void
  [MutationTypes.SORT_WORKSPACES](state: S, payload: {
    listWorkspaces: Array<Workspace>,
  }): void
  [MutationTypes.REMOVE_ENTRIES](state: S, payload: {
    model: Workspace,
    listIndices: Array<Number>,
  }): void
  [MutationTypes.DELETE_WORKSPACE](state: S, payload: {
    index: number,
  }): void
  [MutationTypes.SELECT_WORKSPACE](state: S, payload: {
    index: number,
  }): void
  [MutationTypes.LOAD_INSIGHT_FILE](state: S, payload: {
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
    for (let index = 0; index < payload.listFiles.length; index++) {
      const element = payload.listFiles[index];
      element.order = entrycounter++;
    }
    payload.model.entries.push(...payload.listFiles);
  },
  [MutationTypes.REMOVE_ENTRIES](state, payload: {
    model: Workspace,
    listIndices: Array<number>,
  }) {

    payload.listIndices.forEach(id => {
      let e = payload.model.entries.find((e) => e.id === id);
      if (e) {
        let index = payload.model.entries.indexOf(e);
        if (index > -1) {
          payload.model.entries.splice(index, 1);
        }
      }
    });

  },
  [MutationTypes.SORT_WORKSPACES](state, payload: {
    listWorkspaces: Array<Workspace>,
  }) {
    state.loadedFile.views = payload.listWorkspaces;
  },
  [MutationTypes.DELETE_WORKSPACE](state, payload: {
    index: number,
  }) {

    let activeindex = state.loadedFile.views.findIndex(x => x.isActive);
    let l = activeindex == payload.index ? state.loadedFile.views.length - 1 : -1;

    state.loadedFile.views.splice(payload.index, 1);

    // select next workspace that is open

    if (l > 0) {
      let indexToSelect = payload.index > l - 1 ? l - 1 : payload.index;

      state.loadedFile.views.forEach((entry: View, index: Number) => {
        entry.isActive = index === indexToSelect;
      });
    }
  },
  [MutationTypes.SELECT_WORKSPACE](state, payload: {
    index: number,
  }) {
    state.loadedFile.views.forEach((entry: View, index: Number) => {
      entry.isActive = index === payload.index;
    });
  },
  [MutationTypes.LOAD_INSIGHT_FILE](state, payload: {
    insightFile: InsightFile
  }) {

    setTimeout(function () {
      state.loadedFile = new InsightFile();
      setTimeout(function () {
        state.loadedFile = payload.insightFile;
      }, 20);
    }, 250);
  },

  [MutationTypes.CREATE_WORKSPACE](state) {
    state.loadedFile.views.push(new Workspace());
    let lastIndex = state.loadedFile.views.length - 1;
    state.loadedFile.views.forEach(
      (entry: View, index: Number) => {
        entry.isActive = index === lastIndex;
      }
    );
  },

  [MutationTypes.CREATE_OVERVIEW](state) {
    // state.loadedFile.views.push(new Overview());
    // let lastIndex = state.loadedFile.views.length - 1;
    // state.loadedFile.views.forEach(
    //   (entry: View, index: Number) => {
    //     entry.isActive = index === lastIndex;
    //   }
    // );
  },
}

