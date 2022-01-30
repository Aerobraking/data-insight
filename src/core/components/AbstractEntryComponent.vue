<template>
  <div ref="el">
    <div></div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import WorkspaceViewIfc from "@/core/components/workspace/WorkspaceViewIfc";
import * as _ from "underscore";
import WorkspaceEntry from "@/core/model/WorkspaceEntry";

export default defineComponent({
  name: "wsentryabstract",
  components: {},
  data() {
    return {};
  },
  props: {
    entry: { type: WorkspaceEntry, required: true },
    workspace: { type: Object as () => WorkspaceViewIfc, required: true },
  },
  mounted() {},
  inject: ["entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "toggle") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.entry.id, type);
    },
  },
  computed: {},
  created() {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

 