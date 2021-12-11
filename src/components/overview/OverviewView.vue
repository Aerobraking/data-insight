<template>
  <div
    @mouseenter="setFocusToOverview()"
    @drop.capture="drop"
    @dragenter.stop.prevent
    @dragover.stop.prevent
    tabIndex="1"
    class="overview-viewport"
  >
    <div class="filter-settings">
      <div class="slider"></div>
      <!-- <div class="options"></div> -->
    </div>

    <!-- <div class="overview-search">
      <div></div>
      <input
        @keydown.stop
        @keyup.stop
        type="search"
        @input="searchUpdate"
        v-model="searchString"
        placeholder="Suche..."
      />
    </div> -->

    <div class="overview-wrapper" @mousedown="mousedown"></div>

    <div @mousedown.stop @dblclick.capture.stop class="workspace-menu-bar">
      <!--
      <button>
        <Qrcode @dblclick.capture.stop @click="toggleShadowCanvas" />
      </button> -->
      <button>
        <Pause
          @dblclick.capture.stop
          @click="overviewEngine.engineActive = !overviewEngine.engineActive"
        />
      </button>
      <button><FolderOutline @click="selectFolders()" /></button>
      <button><FolderOutline @click="loadCollection()" /></button>
    </div>

    <button class="pane-button-ov">
      <FormatHorizontalAlignCenter
        v-show="model.paneSize == 0"
        @click="paneButtonClicked()"
      />
      <ArrowCollapseRight
        v-show="model.paneSize > 0"
        @click="paneButtonClicked()"
      />
    </button>
  </div>
</template>

<script lang="ts">
const fs = require("fs");
import { ipcRenderer } from "electron";
import { Workspace } from "@/store/model/Workspace";
import {
  FolderNode,
  FolderOverviewEntry,
} from "@/components/workspace/overview/FileEngine";
import { defineComponent } from "vue";
import noUiSlider, { API, PipsMode } from "nouislider";
import * as WSUtils from "./../workspace/WorkspaceUtils";
import {
  EngineState,
  OverviewEngine,
} from "../workspace/overview/OverviewEngine";
import { Instance } from "../workspace/overview/OverviewTransferHandler";

import path from "path";
import {
  Pause,
  Qrcode,
  FolderOutline,
  FormatHorizontalAlignCenter,
  ArrowCollapseRight,
} from "mdue";
import {
  AbstractNode,
  AbstractOverviewEntry,
} from "../workspace/overview/OverviewData";
import * as d3 from "d3";
import _ from "underscore";

export default defineComponent({
  name: "App",
  components: {
    Qrcode,
    Pause,
    FolderOutline,
    FormatHorizontalAlignCenter,
    ArrowCollapseRight,
  },
  props: {
    model: {
      type: Workspace,
      required: true,
    },
    searchstring: {
      type: String,
      required: true,
    },
  },
  watch: {
    // only draw the canvas when the overview is visibile
    "model.overviewOpen": function (newValue: boolean, oldValue: boolean) {
      if (this.overviewEngine) {
        this.overviewEngine.enablePainting = true;
      }
    },
    "model.paneSize": function (newValue: number, oldValue: number) {
      this.model.overviewOpen = newValue < 100;
    },
    searchstring: function (newValue: String, oldValue: String) {
      this.searchUpdate();
    },
  },
  data(): {
    overviewEngine: OverviewEngine | undefined;
    state: EngineState;
    wsListener: WSUtils.Listener | undefined;
    idOverview: number;
    selection: AbstractOverviewEntry[];
  } {
    return {
      selection: [],
      idOverview: 0,
      wsListener: undefined,
      overviewEngine: undefined,
      state: new EngineState(),
    };
  },
  mounted() {
    const _this = this;

    const sliderDiv = this.$el.getElementsByClassName("slider")[0];

    const format = (value: number) => {
      value = Math.round(value);
      console.log(value);
      if (value < 1024) {
        return "1 MB";
      } else if (value < 1024 * 1024) {
        return Math.round(value / Math.pow(1024, 1)) + " KB";
      } else if (value < 1024 * 1024 * 1024) {
        return Math.round(value / Math.pow(1024, 2)) + " MB";
      } else if (value < 1024 * 1024 * 1024 * 1024) {
        return Math.round(value / Math.pow(1024, 3)) + " GB";
      } else if (value < 1024 * 1024 * 1024 * 1024 * 1024) {
        return Math.round(value / Math.pow(1024, 4)) + " TB";
      }

      return value + " Bytes";
    };

    var slider = noUiSlider.create(sliderDiv, {
      start: [0, 1024 * 1024 * 1024 * 512],
      connect: true,
      behaviour: "drag",
      orientation: "vertical",
      tooltips: {
        to: format,
      },
      margin: 1024 * 1024 * 8,
      range: {
        min: 0, // kb
        "20%": [1024 * 1024 * 32], // mb
        "40%": [1024 * 1024 * 256], // mb
        "60%": [1024 * 1024 * 1024], // gb
        "80%": [1024 * 1024 * 1024 * 16], // gb
        max: [1024 * 1024 * 1024 * 512], // tb
      },
      pips: {
        mode: PipsMode.Range,
        density: 2,
        format: {
          to: format,
        },
      },
    });

    const filterfunc = _.throttle((stats: string, min: number, max: number) => {
      if (_this.overviewEngine) {
        _this.overviewEngine.setColorScale<FolderNode>(
          "size",
          Number(min),
          Number(max),
          (node: FolderNode, stat: number, min: number, max: number) => {
            stat = stat < min ? 0 : stat > max ? max : stat;
            return stat < min || stat > max
              ? "h"
              : d3.interpolateWarm(1 - stat / max);
          },
          200
        );
      }
    }, 128);

    let values: string[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const percent = Math.floor(100 * (i / steps));
      values.push(`${d3.interpolateWarm(i / steps)} ${percent}%`);
    }

    const style = "linear-gradient( 0deg, " + values.join(", ") + ")";

    let divs: HTMLElement[] = this.$el.getElementsByClassName("noUi-connect");
    divs[0].style.backgroundImage = style;
    slider.on(
      "update.one",
      (
        values: (number | string)[],
        handleNumber: number,
        unencoded: number[],
        tap: boolean,
        locations: number[],
        slider: API
      ) => {
        filterfunc("size", Number(values[0]), Number(values[1]));
      }
    );

    /**
     * remove the node data from the vuex store
     */
    Instance.storeData(this.model.overview);
    this.idOverview = this.model.overview.id;

    this.overviewEngine = new OverviewEngine(
      this.$el.getElementsByClassName("overview-wrapper")[0],
      this.state,
      this.model.overview
    );

    let a: FolderOverviewEntry[] = Instance.getData(this.idOverview);
    if (this.overviewEngine) {
      // debugger;
      this.overviewEngine.rootNodes = a;
    }
    //          kb    mb      gb
    // 723889653
    let maxV = 1024 * 1024 * 1024;

    this.overviewEngine.setColorScale<FolderNode>(
      "size",
      0,
      maxV,
      (node: FolderNode, stat: number, min: number, max: number) => {
        stat = stat < min ? 0 : stat > max ? max : stat;
        return stat < min || stat > max
          ? "h"
          : d3.interpolateWarm(1 - stat / max);
      },
      1000
    );

    /**
     * Update the model coordinates with the current ones from the html view.
     */
    this.wsListener = {
      prepareFileSaving(): void {
        Instance.transferData(_this.model.overview);
        console.log(_this.model.overview);
      },
    };

    ipcRenderer.on(
      "files-selected",
      function (
        event: any,
        data: { target: string; files: string[]; directory: string }
      ) {
        if (_this.model.isActive && data.target == "o" + _this.model.id) {
          _this.addFolders(data.files, { x: 0, y: 0 });
        }
      }
    );

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
    mousedown(e: MouseEvent): void {
      const node = this.overviewEngine?.getNodeAtMousePosition();

      if (node) {
      }
    },
    setFocusToOverview(): void {
      setTimeout(() => {
        this.$el.focus();
      }, 2);
    },
    paneButtonClicked(e: MouseEvent) {
      this.model.paneSize = this.model.paneSize == 0 ? 50 : 100;
    },
    selectFolders() {
      ipcRenderer.send("select-files", {
        target: "o" + this.model.id,
        type: "folders",
        path: this.model.folderSelectionPath,
      });
    },
    searchUpdate() {
      let lowercase = this.searchstring.toLowerCase().trim();
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
    setMode1() {
      if (this.overviewEngine) {
        let maxV = 1024 * 1024 * 512;

        this.overviewEngine.setColorScale<FolderNode>(
          "size",
          0,
          maxV,
          (node: FolderNode, stat: number, min: number, max: number) => {
            stat = stat < min ? 0 : stat > max ? max : stat;
            return stat < min || stat > max
              ? "h"
              : d3.interpolateWarm(1 - stat / max);
          },
          400
        );
      }
    },
    setMode2() {
      if (this.overviewEngine) {
        let maxV = 1024 * 1024 * 50;

        this.overviewEngine.setColorScale<FolderNode>(
          "size",
          0,
          maxV,
          (node: FolderNode, stat: number, min: number, max: number) => {
            stat = stat < min ? 0 : stat > max ? max : stat;
            return stat < min || stat > max
              ? "h"
              : d3.interpolateWarm(1 - stat / max);
          },
          400
        );
      }
    },
    loadCollection() {
      if (this.overviewEngine) {
        let n: FolderNode = this.overviewEngine.selection[0] as FolderNode;

        if (n && n.entry) {
          n.entry.loadCollection(n);
        }
      }
    },
    addFolders(listFolders: string[], pos: { x: number; y: number }) {
      let listEntries: FolderOverviewEntry[] = Instance.getData(
        this.idOverview
      );

      console.log(pos);

      /**
       * create the entries based on the dropped files.
       */
      for (let index = 0; index < listFolders.length; index++) {
        const f = listFolders[index];
        const p = path.normalize(f).replace(/\\/g, "/");
        const fileStat = fs.lstatSync(p);
        if (fileStat.isDirectory()) {
          let root: FolderOverviewEntry = new FolderOverviewEntry(p);
          root.setCoordinates(pos);
          root.engine = this.overviewEngine;
          root.depth = 3;
          listEntries.push(root);
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
    drop(e: DragEvent) {
      let listFolders: string[] = [];

      /**
       * create the entries based on the dropped files.
       */
      if (e.dataTransfer && this.overviewEngine) {
        for (let index = 0; index < e.dataTransfer?.files.length; index++) {
          const f = e.dataTransfer?.files[index];
          listFolders.push(f.path);
        }

        this.addFolders(
          listFolders,
          this.overviewEngine.screenToGraphCoords(e)
        );
      }
    },
  },
});
</script>

<style   lang="scss">
.filter-settings {
  position: absolute;
  top: 90px;
  right: 5px;
  width: 32px;
  height: 70%;
  z-index: 6000;
  .slider {
    height: 100%;
  }
  .options {
    position: absolute;
    //  background: #fff;
    left: 100%;
    top: 0;
    height: 250px;
    width: 150px;
  }
}

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
