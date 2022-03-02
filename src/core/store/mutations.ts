import { MutationTree } from 'vuex'
import { MutationTypes } from './mutation-types'
import { State } from './state'
import View from '@/core/model/AbstractView';
import { Workspace } from '@/core/model/workspace/Workspace';
import AbstractWorkspaceEntry from '@/core/model/workspace/WorkspaceEntry';
import { InsightFile } from '../model/InsightFile';

export type Mutations<S = State> = {
  // als key für die methode nehmen wir die einzelnen enum types. und da wir die method eh nicht direkt aurufen ala setCounter() sondern per commit("setCounter", parameter ...)
  // haben wir dann einfach das enum anstelle des strings commit(MutationTypes.SET_COUNTER,parameter ...) 

  [MutationTypes.CREATE_WORKSPACE](state: S): void
  [MutationTypes.ADD_ENTRIES](state: S, payload: {
    model: Workspace,
    entries: Array<AbstractWorkspaceEntry>,
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
  [MutationTypes.COPY_WORKSPACE](state: S, payload: {
    index: number,
  }): void
  [MutationTypes.SELECT_WORKSPACE](state: S, payload: {
    index: number,
  }): void
  [MutationTypes.LOAD_INSIGHT_FILE](state: S, payload: {
    insightFile: InsightFile
  }): void
  [MutationTypes.SHOW_UI](state: S, payload: {
    showUI: boolean
  }): void
}

/**
 * Implementiert unser type (interface), hier haben wir dann also den code für jede methode die wir definiert haben im type.
 */
export const mutations: MutationTree<State> & Mutations = {

  [MutationTypes.ADD_ENTRIES](state, payload: {
    model: Workspace,
    entries: Array<AbstractWorkspaceEntry>,
  }) {
    for (let i = 0; i < payload.entries.length; i++) {
      const entry = payload.entries[i];
      let id = 0;
      while (payload.model.entries.find(e => e.id == id) || payload.entries.find(e => e.id == id)) { id++ };
      entry.id = id;
      entry.order = payload.model.entries.length + i;
      // make id's unique in case of a copy/paste situation 
    }
    payload.model.entries.push(...payload.entries);
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
    state.loadedFile.views.splice(payload.index, 1);
  },
  [MutationTypes.COPY_WORKSPACE](state, payload: {
    index: number,
  }) {

    let activeindex = state.loadedFile.views.findIndex(x => x.isActive);

    let w = state.loadedFile.views[activeindex];

    let wCopy = new Workspace();
    Object.assign(wCopy, w);

    let id = 0;
    while (state.loadedFile.views.find(e => e.id == id)) { id++ };
    wCopy.id = id;

    state.loadedFile.views.push(wCopy);
    let lastIndex = state.loadedFile.views.length - 1;
    state.loadedFile.views.forEach(
      (entry: View, index: Number) => {
        entry.isActive = index === lastIndex;
      }
    );
  },
  [MutationTypes.SELECT_WORKSPACE](state, payload: {
    index: number,
  }) {
    payload.index = payload.index < 0 ? 0 : payload.index > state.loadedFile.views.length - 1 ? state.loadedFile.views.length - 1 : payload.index;
    state.loadedFile.views.forEach((entry: View, index: Number) => {
      entry.isActive = index === payload.index;
    });
  },
  [MutationTypes.LOAD_INSIGHT_FILE](state, payload: {
    insightFile: InsightFile
  }) {
    setTimeout(function () {
      const timeForSinc = performance.now();
      let empty = new InsightFile();
      empty.views = [];
      state.loadedFile = empty;
      setTimeout(function () {
        state.loadedFile = payload.insightFile;

        console.log(
          "Time for commiting ins File to Vue: ",
          (performance.now() - timeForSinc) / 1000,
          "seconds"
        );

      }, 10);
    }, 250);
  },
  [MutationTypes.CREATE_WORKSPACE](state) {
    const w = new Workspace();
    let id = 0;
    while (state.loadedFile.views.find(e => e.id == id)) { id++ };
    w.id = id;

    state.loadedFile.views.push(w);
    let lastIndex = state.loadedFile.views.length - 1;

    state.loadedFile.views.forEach(
      (entry: View, index: Number) => {
        entry.isActive = index === lastIndex;
      }
    );
  },
  [MutationTypes.SHOW_UI](state, payload) {
    state.loadedFile.settings.showUI = payload.showUI;
  },
}

