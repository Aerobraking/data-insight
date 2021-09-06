<template>
  <div @drop="drop" class="overview-viewport"></div>
</template>

<script lang="ts">
import { Overview } from "@/store/model/OverviewDataModel";
import { Workspace } from "@/store/model/Workspace";
import {FolderRootNode} from "@/components/workspace/overview/FileEngine"
import { defineComponent } from "vue";
import {
  EngineState,
  OverviewEngine,
} from "../workspace/overview/OverviewEngine";
import OverviewCanvas from "./OverviewCanvas.vue";
const fs = require("fs");
const path = require("path");

export default defineComponent({
  el: ".overview-viewport",
  name: "App",
  components: {
    OverviewCanvas,
  },
  props: {
    model: Workspace,
  },
  data(): {
    overviewEngine: OverviewEngine | null;
    state: EngineState;
  } {
    return {
      overviewEngine: null,
      state: new EngineState(),
    };
  },
  mounted() {
    this.overviewEngine = new OverviewEngine(this.$el, this.state);
  },
  unmounted() {
    this.overviewEngine?.destroy();
  },
  computed: {},
  methods: {
    drop(e: DragEvent) {
      e.preventDefault();

      if (e.dataTransfer) {
        for (let index = 0; index < e.dataTransfer?.files.length; index++) {
          const f = e.dataTransfer?.files[index];
          const fileStat = fs.lstatSync(f.path);
          if (fileStat.isDirectory()) {
            let root: FolderRootNode = new FolderRootNode(f.path);
            root.startWatcher();
          }
        }
      }
    },
  },
});
</script>

 