/**
 * Some packages that are used don't have typescript definitions
 * so we declare them here to not getting errors in vscode.
 */
/* eslint-disable */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
declare module "scandirectory"
declare module "d3-force-reuse"
declare module "pell"
declare module "splitpanes"
declare module "vue-tippy"
declare module "vue-panzoom";

