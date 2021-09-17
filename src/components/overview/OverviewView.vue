<template>
  <div @drop.stop="drop" class="overview-viewport">
    <div class="overview-search">
      <div></div>
      <input
        @keydown.stop
        @keyup.stop
        type="search"
        @input="searchUpdate"
        v-model="searchString"
        placeholder="Suche..."
      />
      <div></div>
      <!-- <wssearchlist
        class="search-results"
        v-if="searchActive"
        :model="model"
        :searchString="searchString"
        @bookmarkclicked="moveToEntry"
      ></wssearchlist> -->
    </div>

    <div
      :class="{ 'prevent-input': !model.overviewOpen }"
      class="overview-wrapper"
    ></div>

    <div @mousedown.stop @dblclick.capture.stop class="workspace-menu-bar">
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
import {
  AbstractNode,
  AbstractOverviewEntry,
} from "../workspace/overview/OverviewData";
import scandir from "scandirectory";

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
  watch: {
    // only draw the canvas when the overview is visibile
    "model.overviewOpen": function (newValue: boolean, oldValue: boolean) {
      if (this.overviewEngine) {
        this.overviewEngine.enablePainting = newValue;
      }
    },
  },
  data(): {
    overviewEngine: OverviewEngine | undefined;
    state: EngineState;
    wsListener: WSUtils.Listener | undefined;
    idOverview: number;
    searchString: string;
  } {
    return {
      idOverview: 0,
      wsListener: undefined,
      overviewEngine: undefined,
      state: new EngineState(),
      searchString: "",
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
    searchUpdate() {
      let lowercase = this.searchString.toLowerCase().trim();
      let nodesMatching: AbstractNode[] = [];

      if (lowercase.length > 0) {
        if (this.overviewEngine) {
          for (let i = 0; i < this.overviewEngine.rootNodes.length; i++) {
            const entry: AbstractOverviewEntry =
              this.overviewEngine.rootNodes[i];

            for (let j = 0; j < entry.nodes.length; j++) {
              const n = entry.nodes[j];

              if (n.name.toLowerCase().includes(lowercase)) {
                nodesMatching.push(...n.parents(true));
              }
            }
          }
        }
        this.overviewEngine?.setFilterList("search", nodesMatching);
      } else {
        this.overviewEngine?.setFilterList("search");
      }
    },
    toggleShadowCanvas() {
      this.overviewEngine?.showShadowCanvas(!this.overviewEngine.showShadow);

      console.log(this.overviewEngine?.rootNodes);
    },
    drop(e: DragEvent) {
      e.preventDefault();

      let listEntries: FolderOverviewEntry[] = Instance.getData(
        this.idOverview
      );

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
            listEntries.push(root);
          }
        }
      }

      /**
       * register the entries to the engine
       */
      if (this.overviewEngine) {
        this.overviewEngine.rootNodes = listEntries;
      }

      /**
       * start syncing the folders in the entry.
       */
      for (let i = 0; i < listEntries.length; i++) {
        const e = listEntries[i];
        e.startWatcher();
      }
    },
  },
});
</script>

 
<style   lang="scss">
.overview-viewport {
  display: flex;
  flex-flow: column;
  height: 100%;
  width: 100%;
  position: absolute;
  overflow: hidden;
}

.overview-wrapper {
  position: relative;
  flex: 1 !important;
  height: initial !important;

  left: 0;
  top: 0;
  width: 100%;

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

.overview-search {
  position: relative;

  border: none;
  background: #fff;
  padding-top: 0px;
  padding-bottom: 0px;
  width: 100%;

  button {
    border: none;
    height: 100%;
    outline: none;

    background-color: #fff;
    &:hover {
      background-color: #aaa;
    }
  }

  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr;
  input {
    background: #eee;
    height: 28px;
    border: none;
    outline: none;
    border-left: 1px solid #aaa;
    border-right: 1px solid #aaa;
    position: relative;
  }
  .search-results {
    background: #fff;
    position: absolute;
    top: 100%;
    left: 33.33%;
    width: 33.33%;
    color: #333;
    overflow: hidden;
  }
}
</style>
