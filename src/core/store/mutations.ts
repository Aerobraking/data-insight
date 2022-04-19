import { MutationTree } from 'vuex'
import { MutationTypes } from './mutation-types'
import { State } from './state'
import Activity from '@/core/model/AbstractView';
import { Workspace } from '@/core/model/workspace/Workspace';
import AbstractWorkspaceEntry from '@/core/model/workspace/WorkspaceEntry';
import { InsightFile } from '../model/InsightFile';

/**
 * For each Mutation Enum the type of the payload is defined here.
 */
export type Mutations<S = State> = {
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
 * The concrete code for each mutation. 
 * ToDo: When adding the Undo System, all actions in the app should be represented by a mutation 
 * and the payload has to have an interface that contains the Command Pattern with undo, redo, etc. methods.
 */
export const mutations: MutationTree<State> & Mutations = {

  /**
   * Add the given WorkspaceEntry Instances to the given Workspace.
   * @param state
   * @param payload 
   */
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
  /**
   * Removes the given WorkspaceEntry Instances from the Workspace.
   * @param state 
   * @param payload 
   */
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
  /**
   * Rearrange the order of the workspaces by passing a list in the payload
   * that contains a new list with the altered order.
   * @param state 
   * @param payload 
   */
  [MutationTypes.SORT_WORKSPACES](state, payload: {
    listWorkspaces: Array<Activity>,
  }) {
    state.loadedFile.views = payload.listWorkspaces;
  },
  /**
   * Deletes the workspace at the given index.
   * @param state 
   * @param payload 
   */
  [MutationTypes.DELETE_WORKSPACE](state, payload: {
    index: number,
  }) {
    state.loadedFile.views.splice(payload.index, 1);
  },
  /**
   * Dublicates the Workspace at the given index at puts it at the end of the workspace list.
   * @param state 
   * @param payload 
   */
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
      (entry: Activity, index: Number) => {
        entry.isActive = index === lastIndex;
      }
    );
  },
  /**
   * Makes the workspace at the given index active, so it will be visible in the UI.
   * @param state 
   * @param payload 
   */
  [MutationTypes.SELECT_WORKSPACE](state, payload: {
    index: number,
  }) {
    payload.index = payload.index < 0 ? 0 : payload.index > state.loadedFile.views.length - 1 ? state.loadedFile.views.length - 1 : payload.index;
    state.loadedFile.views.forEach((entry: Activity, index: Number) => {
      entry.isActive = index === payload.index;
    });
  },
  /**
   * Puts the given InsightFile Object into the state of the store, which triggers
   * the complete UI to update to the new state.
   * @param state 
   * @param payload 
   */
  [MutationTypes.LOAD_INSIGHT_FILE](state, payload: {
    insightFile: InsightFile
  }) {
    /**
     * We put an empty object as the state first because otherwise
     * the old views may be used for new objects which leads to errors.
     * Still need to find a way to fix that
     */
    const timeForSinc = performance.now();
    let empty = new InsightFile();
    empty.views = [];
    state.loadedFile = empty;
    setTimeout(function () {
      state.loadedFile = payload.insightFile;
      console.log("Time for commiting ins File to Vue: ",
        (performance.now() - timeForSinc) / 1000, "seconds"
      );
    }, 10);
  },
  /**
   * Creates a new workspace and makes it active.
   * @param state 
   */
  [MutationTypes.CREATE_WORKSPACE](state) {
    const w = new Workspace();
    let id = 0;
    while (state.loadedFile.views.find(e => e.id == id)) { id++ };
    w.id = id;

    state.loadedFile.views.push(w);
    let lastIndex = state.loadedFile.views.length - 1;

    state.loadedFile.views.forEach(
      (entry: Activity, index: Number) => {
        entry.isActive = index === lastIndex;
      }
    );
  },
  /**
   * Show/hides 
   * @param state 
   * @param payload 
   */
  [MutationTypes.SHOW_UI](state, payload) {
    state.loadedFile.settings.showUI = payload.showUI;
  },
}

