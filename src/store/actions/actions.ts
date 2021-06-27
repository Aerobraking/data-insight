import { ActionTree, ActionContext } from 'vuex'
import { State } from './../state'
import { Mutations } from './../mutations/mutations'
import { ActionTypes } from './action-types'
import { MutationTypes } from './../mutations/mutation-types'

type AugmentedActionContext = {
  commit<K extends keyof Mutations>(
    key: K,
    payload: Parameters<Mutations[K]>[1]
  ): ReturnType<Mutations[K]>
} & Omit<ActionContext<State, State>, 'commit'>

export interface Actions {
  [ActionTypes.GET_COUNTER](
    { commit }: AugmentedActionContext,
    payload: number
  ): Promise<number>
}

export const actions: ActionTree<State, State> & Actions = {
  [ActionTypes.GET_COUNTER]({ commit }) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const data = 256
        commit(MutationTypes.SET_COUNTER, data)
        resolve(data)
      }, 500)
    })
  },
  [ActionTypes.CREATE_WORKSPACE]({ commit }) {
    commit(MutationTypes.SET_COUNTER)
  },
}
