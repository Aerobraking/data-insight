import {
  createStore,
  Store as VuexStore,
  CommitOptions,
  DispatchOptions,
} from 'vuex'
import {  State } from './state'
import { Getters, getters } from './getters'
import { Mutations, mutations } from './mutations'
import { Actions, actions } from './actions'
import { InsightFile } from '../model/InsightFile'

export function initStore(file: InsightFile) {
  return createStore({
    state: {
      loadedFile: file
    },
    getters,
    mutations,
    actions,
  })
} 

/**
 * hier legen wir fest, das unsere erstellten getters, commit (mutations) und dispatch (actions)
 * vom Store objekt auch genutzt werden.  
 */
export type Store = Omit<VuexStore<State>, 'getters' | 'commit' | 'dispatch'>
  & {
    getters: {
      [K in keyof Getters]: ReturnType<Getters[K]>
    }
  } & {
    commit<K extends keyof Mutations, P extends Parameters<Mutations[K]>[1]>(
      key: K,
      payload?: P,
      options?: CommitOptions
    ): ReturnType<Mutations[K]>
  }
  & {
    dispatch<K extends keyof Actions>(
      key: K,
      payload: Parameters<Actions[K]>[1],
      options?: DispatchOptions
    ): ReturnType<Actions[K]>
  }

