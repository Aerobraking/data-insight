<template>
  <div @drop.stop="drop" class="overview-viewport">
    <div
      :class="{ 'prevent-input': !model.overviewOpen }"
      class="overview-wrapper"
    ></div>
  </div>
</template>

<script lang="ts">
import { Overview } from "@/store/model/OverviewDataModel";
import { Workspace } from "@/store/model/Workspace";
import {
  FolderNode,
  FolderOverviewEntry,
} from "@/components/workspace/overview/FileEngine";
import { defineComponent } from "vue";

import * as WSUtils from "./../workspace/WorkspaceUtils";
import { AbstractOverviewEntry } from "../workspace/overview/OverviewData";
import {
  EngineState,
  OverviewEngine,
} from "../workspace/overview/OverviewEngine";
import OverviewCanvas from "./OverviewCanvas.vue";
import { Instance } from "../workspace/overview/OverviewTransferHandler";
import { ElementDimension, getCoordinatesFromElement } from "@/utils/resize";
import { WorkspaceViewIfc } from "../workspace/WorkspaceUtils";
const fs = require("fs");
import path from "path";

export default defineComponent({
  name: "App",
  components: {
    OverviewCanvas,
  },
  props: {
    model: {
      type: Workspace,
      required: true,
    },
  },
  data(): {
    overviewEngine: OverviewEngine | undefined;
    state: EngineState;
    wsListener: WSUtils.Listener | undefined;
    idOverview: number;
  } {
    return {
      idOverview: 0,
      wsListener: undefined,
      overviewEngine: undefined,
      state: new EngineState(),
    };
  },
  mounted() {
    /**
     * remove the node data from the vuex store
     */
    Instance.storeData(this.model.overview);
    let _this = this;
    this.idOverview = this.model.overview.id;

    this.overviewEngine = new OverviewEngine(
      this.$el.getElementsByClassName("overview-wrapper")[0],
      this.state,
      this.model.overview
    );
    this.overviewEngine.start();

    this.overviewEngine.transform;

    let a: FolderOverviewEntry[] = Instance.getData(this.idOverview);
    if (this.overviewEngine) {
      // debugger;
      this.overviewEngine.rootNodes = a;
    }

    this.wsListener = {
      dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void {},
      /**
       * Update the model coordinates with the current ones from the html view.
       */
      prepareFileSaving(): void {
        Instance.transferData(_this.model.overview);
        console.log(_this.model.overview);
      },
      zoom(
        transform: { x: number; y: number; scale: number },
        workspace: WorkspaceViewIfc
      ): void {},
      pluginStarted(modal: boolean): void {},
    };

    WSUtils.Events.registerCallback(this.wsListener);
  },
  unmounted() {
    this.overviewEngine?.destroy();
    if (this.wsListener) {
      WSUtils.Events.unregisterCallback(this.wsListener);
    }
  },
  computed: {},
  methods: {
    drop(e: DragEvent) {
      e.preventDefault();

      let a: FolderOverviewEntry[] = Instance.getData(this.idOverview);

      if (e.dataTransfer && this.overviewEngine) {
        for (let index = 0; index < e.dataTransfer?.files.length; index++) {
          const f = e.dataTransfer?.files[index];
          const p = path.normalize(f.path).replace(/\\/g, "/");
          console.log("original: " + f.path);
          console.log("normalized: " + path.normalize(f.path));
          console.log("sep: " + path.sep);
          console.log("forward: " + path.normalize(f.path).replace(/\\/g, "/"));
          console.log();

          const fileStat = fs.lstatSync(p);
          if (fileStat.isDirectory()) {
            let root: FolderOverviewEntry = new FolderOverviewEntry(
              path.normalize(p)
            );
            root.setCoordinates(this.overviewEngine.screenToGraphCoords(e));
            root.startWatcher();

            a.push(root);
          }
        }
      }
      setTimeout(() => {
        if (this.overviewEngine) {
          this.overviewEngine.rootNodes = a;
        }
      }, 50);
    },
  },
});
</script>

 
<style   lang="scss">
.overview-wrapper {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}
</style>
