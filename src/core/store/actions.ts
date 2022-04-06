import { ActionTree, ActionContext } from 'vuex'
import { State } from './state'
import { Mutations } from './mutations'

/**
 * Vuex Actions are not used in the moment in our App. Maybe later. :) 
 * But we nevertheless we need the typescript definition of it for creating the store type.
 */
type AugmentedActionContext = {
  commit<K extends keyof Mutations>(
    key: K,
    payload: Parameters<Mutations[K]>[1]
  ): ReturnType<Mutations[K]>
} & Omit<ActionContext<State, State>, 'commit'>

export interface Actions { }

export const actions: ActionTree<State, State> & Actions = {}
