<template>
  <div ref="el">
    <div></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import WorkspaceViewIfcWrapper from "@/core/utils/WorkspaceViewIfcWrapper";
import * as _ from "underscore";
import WorkspaceEntry, { DefaultWorkspaceEntry } from "@/core/model/fileactivity/workspace/WorkspaceEntry";

export default defineComponent({
  name: "wsentryabstract",
  components: {},
  data() {
    return {};
  },
  props: {
    entry: { type: DefaultWorkspaceEntry, required: true },
    workspace: { type: WorkspaceViewIfcWrapper, required: true },
  },
  mounted() {},
  inject: ["entrySelected"],
  methods: {
    /**
     * Call this method to selected this Entry in the workspace
     * @param type add: Adds this node to the selection, single: make this entry as the new unique selection
     * toggle: toggles the selection status for this entry.
     */
    entrySelectedLocal(type: "add" | "single" | "toggle") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.entry.id, type);
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

 