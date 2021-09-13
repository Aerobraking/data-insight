<template>
  <div @drop.stop="drop" class="overview-viewport">
    <div
      :class="{ 'prevent-input': !model.overviewOpen }"
      class="overview-wrapper"
    ></div>

    <div
      @mousedown.stop
      @dblclick.capture.stop
      class="workspace-menu-bar"
      :class="{ 'workspace-menu-bar-hide': !getShowUI }"
    >
      <button>
        <Qrcode @dblclick.capture.stop @click="toggleShadowCanvas" />
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Workspace } from "@/store/model/Workspace";
import { FolderOverviewEntry } from "@/components/workspace/overview/FileEngine";
import { defineComponent } from "vue";

import * as WSUtils from "./../workspace/WorkspaceUtils";
import {
  EngineState,
  OverviewEngine,
} from "../workspace/overview/OverviewEngine";
import OverviewCanvas from "./OverviewCanvas.vue";
import { Instance } from "../workspace/overview/OverviewTransferHandler";
import { WorkspaceViewIfc } from "../workspace/WorkspaceUtils";
const fs = require("fs");
import path from "path";
import {
  FormTextbox,
  Resize,
  CommentTextOutline,
  Overscan,
  Youtube,
  Qrcode,
  Table,
  Group,
  ArrowExpand,
  DeleteEmptyOutline,
  BorderAll,
  ResizeBottomRight,
  FormatSize,
  Download,
  FolderOutline,
  FileOutline,
  EmoticonHappyOutline,
} from "mdue";

export default defineComponent({
  name: "App",
  components: {
    OverviewCanvas,
    Qrcode,
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
    toggleShadowCanvas() {
      this.overviewEngine?.showShadowCanvas(!this.overviewEngine.showShadow);
    },
    drop(e: DragEvent) {
      e.preventDefault();

      let a: FolderOverviewEntry[] = Instance.getData(this.idOverview);

      /**
       * create the entries based on the dropped files.
       */
      if (e.dataTransfer && this.overviewEngine) {
        for (let index = 0; index < e.dataTransfer?.files.length; index++) {
          const f = e.dataTransfer?.files[index];
          const p = path.normalize(f.path).replace(/\\/g, "/");

          const fileStat = fs.lstatSync(p);
          if (fileStat.isDirectory()) {
            let root: FolderOverviewEntry = new FolderOverviewEntry(p);
            root.setCoordinates(this.overviewEngine.screenToGraphCoords(e));
            root.engine = this.overviewEngine;
            a.push(root);
          }
        }
      }

      /**
       * register the entries to the engine
       */
      if (this.overviewEngine) {
        this.overviewEngine.rootNodes = a;
      }

      /**
       * start syncing the folders in the entry.
       */
      for (let i = 0; i < a.length; i++) {
        const e = a[i];
        e.startWatcher();
      }
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

  canvas {
    image-rendering: optimizeSpeed;
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: optimize-contrast;
    image-rendering: pixelated;
    -ms-interpolation-mode: nearest-neighbor;
  }
}
.grabbable {
  // cursor: pointer !important;
}
</style>
