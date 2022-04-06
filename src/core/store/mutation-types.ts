/**
 * Each mutation is defined by an enum for better and more clear usage of mutations.
 * See the mutations.ts File for detailed description of what each mutation does.
 */
export enum MutationTypes {
  CREATE_WORKSPACE = 'CREATE_WORKSPACE',
  COPY_WORKSPACE = 'COPY_WORKSPACE',
  DELETE_WORKSPACE = 'DELETE_WORKSPACE',
  SELECT_WORKSPACE = 'SELECT_WORKSPACE',
  ADD_ENTRIES = 'ADD_FILES',
  SORT_WORKSPACES = 'SORT_WORKSPACES',
  REMOVE_ENTRIES = 'REMOVE_ENTRIES',
  LOAD_INSIGHT_FILE = "LOAD_INSIGHT_FILE",
  SHOW_UI = "SHOW_UI"
}