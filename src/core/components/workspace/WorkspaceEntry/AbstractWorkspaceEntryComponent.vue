<template>
  <div ref="el">
    <div></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import WorkspaceViewIfcWrapper from "@/core/components/workspace/WorkspaceViewIfcWrapper";
import * as _ from "underscore";
import WorkspaceEntry from "@/core/model/workspace/WorkspaceEntry";

export default defineComponent({
  name: "wsentryabstract",
  components: {},
  data() {
    return {};
  },
  props: {
    entry: { type: WorkspaceEntry, required: true },
    workspace: { type: WorkspaceViewIfcWrapper, required: true },
  },
  mounted() {},
  inject: ["entrySelected"],
  methods: {
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

 