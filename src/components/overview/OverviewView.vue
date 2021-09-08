<template>
  <div @drop.stop="drop" class="overview-viewport"></div>
</template>

<script lang="ts">
import { Overview } from "@/store/model/OverviewDataModel";
import { Workspace } from "@/store/model/Workspace";
import { FolderRootNode } from "@/components/workspace/overview/FileEngine";
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
    overviewEngine: OverviewEngine | undefined;
    state: EngineState;
  } {
    return {
      overviewEngine: undefined,
      state: new EngineState(),
    };
  },
  mounted() {
    this.overviewEngine = new OverviewEngine(this.$el, this.state);
    this.overviewEngine.start();
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
            this.$props.model?.overview.RootNodes.push(root);
          }
        }
      }
      setTimeout(() => {
        if (this.overviewEngine != undefined) {
          this.overviewEngine.rootNodes = this.$props.model?.overview.RootNodes;
        }
      }, 900);
    },
  },
});
</script>

 