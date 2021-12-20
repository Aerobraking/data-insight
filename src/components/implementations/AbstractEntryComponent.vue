<template>
  <div ref="el" class="ws-entry-X">
    <!-- <wsentrydisplayname :entry="entry" /> -->
    <slot></slot>
    <div></div>
  </div>
</template>

<script lang="ts"> 

import { defineComponent } from "vue";
import { setupEntry, WorkspaceViewIfc } from "../app/WorkspaceUtils";
import * as _ from "underscore";
import { WorkspaceEntry } from "@/store/model/ModelAbstractData";

export default defineComponent({
  name: "wsentryX",
  components: {},
  setup(props) {
    return setupEntry(props, {
      prepareFileSaving(): void {},
    });
  },
  data() {
    return {};
  },
  props: {
    entry: { type: WorkspaceEntry, required: true },
    viewKey: Number,
    workspace: { type: Object as () => WorkspaceViewIfc },
  },
  mounted() {},
  inject: ["entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "flip") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
    },
  },
  computed: {},
  created() {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.ws-entry-X {
  background: red;
}
</style>

 