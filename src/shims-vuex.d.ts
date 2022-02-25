/* eslint-disable  */
import { ComponentCustomProperties } from 'vue'
import { Store } from './core/store/store'

declare module '@vue/runtime-core' {
  // declare your own store states
  // provide typings for `this.$store`
  interface ComponentCustomProperties {
    $store: Store
  }
}

