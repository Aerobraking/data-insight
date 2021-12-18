<template>
  <div
    @mouseenter="setFocusToOverview()"
    @drop.capture="drop"
    @dragenter.stop.prevent
    @dragover.stop.prevent
    tabIndex="1"
    class="overview-viewport"
  >
    <div
      class="filter-settings"
      :class="{ 'filter-settings-hide': !model.showFilterSettings }"
    >
      <button>
        <TuneVerticalVariant
          @click="model.showFilterSettings = !model.showFilterSettings"
        />
      </button>
      <div v-show="model.showFilterSettings" class="slider"></div>
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

    <panZoom
      @init="panHappen"
      tabIndex="0"
      :options="{
        zoomDoubleClickSpeed: 1,
        minZoom: 0.03,
        maxZoom: 15,
        bounds: false,
        initialX: model.overview.viewportTransform.x,
        initialY: model.overview.viewportTransform.y,
        initialZoom: model.overview.viewportTransform.scale,
      }"
      selector=".zoomable"
    >
      <div class="zoomable close-file-anim">
        <!-- <div class="rectangle-selection"></div> -->
        <!-- <div class="rectangle-selection-wrapper">
                <button class="ws-zoom-fixed resizer-bottom-right">
                  <ResizeBottomRight />
                </button>
                <button
                  class="ws-zoom-fixed selection-system-drag"
                  @mousedown.capture.stop="startFileDrag()"
                  @click.capture.stop
                >
                  <FileOutline />
                </button>
              </div> -->

        <!-- <keep-alive>
                <component
                  class="ws-entry"
                  v-for="e in model.entries"
                  :name="e.id"
                  :key="e.id"
                  :entry="e"
                  :viewId="model.id"
                  :workspace="this"
                  v-bind:is="e.componentname"
                  ref="wsentry"
                >
                </component>
              </keep-alive> -->

        <div
          :class="{ 'blend-out': model.entries.length > 0 }"
          class="welcome-message"
        >
          <h2>
            Let's drop some files to get going!
            <EmoticonHappyOutline class="svg-smile" />
          </h2>
          <p>
            <FolderOutline class="svg-folder" />
          </p>
          <p><Download class="svg-download" /></p>
        </div>
      </div>
    </panZoom>

    <div class="overview-wrapper" @mousedown="mousedown"></div>

    <div
      @mousedown.stop
      @dblclick.capture.stop
      class="workspace-menu-bar"
      :class="{ 'workspace-menu-bar-hide': !getShowUI }"
    >
      <!--
      <button>
        <Qrcode @dblclick.capture.stop @click="toggleShadowCanvas" />
      </button> -->
      <!-- <button>
        <Pause
          @dblclick.capture.stop
          @click="overviewEngine.engineActive = !overviewEngine.engineActive"
        />
      </button> -->
      <tippy-singleton
        :moveTransition="'transform 0.2s ease-out'"
        :offset="[0, 40]"
      >
        <tippy>
          <button><Overscan @click="showAll()" /></button>
          <template #content>Show All</template>
        </tippy>
        <tippy>
          <button><FolderOutline @click="selectFolders()" /></button>
          <template #content>Add Folders</template>
        </tippy>
        <tippy>
          <button><DeleteEmptyOutline @click="deleteSelection()" /></button>
          <template #content>Delete</template>
        </tippy>
        <tippy>
          <button><FolderOutline @click="loadCollection()" /></button>
          <template #content>Create Collection</template>
        </tippy>
        <tippy>
          <button><FolderOutline @click="createCollection()" /></button>
          <template #content>Open Collection</template>
        </tippy>
        <tippy>
          <button><FolderOutline @click="createRootFromNode()" /></button>
          <template #content>Create Entry from Selection</template>
        </tippy>
      </tippy-singleton>
    </div>

    <button
      class="pane-button-ov"
      :class="{ 'workspace-menu-bar-hide': !getShowUI }"
    >
      <FormatHorizontalAlignCenter
        v-show="model.paneSize <= 15"
        @click="paneButtonClicked()"
      />
      <ArrowCollapseRight
        v-show="model.paneSize > 15"
        @click="paneButtonClicked()"
      />
    </button>
  </div>
</template>

<script lang="ts">
const fs = require("fs");
import { Tippy, TippySingleton } from "vue-tippy";
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
  DeleteEmptyOutline,
  Qrcode,
  EmoticonHappyOutline,
  Download,
  TuneVerticalVariant,
  Overscan,
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
import { set3DPosition } from "@/utils/resize";

export default defineComponent({
  name: "App",
  components: {
    Tippy,
    TippySingleton,
    Qrcode,
    TuneVerticalVariant,
    EmoticonHappyOutline,
    Overscan,
    Pause,
    Download,
    DeleteEmptyOutline,
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
      if (Instance.getEngine(this.idOverview)) {
        Instance.getEngine(this.idOverview).enablePainting = true;
      }
    },
    "model.paneSize": function (newValue: number, oldValue: number) {
      this.model.overviewOpen = newValue < 100;
    },
    "selection.y": function (newValue: number, oldValue: number) {
      console.log(newValue);
    },
    "model.overview.viewportTransform": function (
      newValue: { x: number; y: number; scale: number },
      oldValue: { x: number; y: number; scale: number }
    ) {
      // sync the panzoom div content with the canvas viewport transformations
      this.updateDivTransformation(newValue);
    },
    searchstring: function (newValue: String, oldValue: String) {
      this.searchUpdate();
    },
  },
  data(): {
    state: EngineState;
    wsListener: WSUtils.Listener | undefined;
    idOverview: number;
    panZoomInstance: any;
    selection: AbstractNode | undefined;
  } {
    return {
      selection: undefined,
      idOverview: 0,
      panZoomInstance: null,
      wsListener: undefined,
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
      if (Instance.getEngine(this.idOverview)) {
        Instance.getEngine(this.idOverview).setColorScale<FolderNode>(
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

    Instance.createEngine(
      this.idOverview,
      this.$el.getElementsByClassName("overview-wrapper")[0],
      this.model.overview
    );

    Instance.getEngine(this.idOverview).rootNodes = Instance.getData(
      this.idOverview
    );
    //         kb     mb     gb
    let maxV = 1024 * 1024 * 1024;

    Instance.getEngine(this.idOverview).setColorScale<FolderNode>(
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

    // init view for div
    this.updateDivTransformation(this.model.overview.viewportTransform);

    set3DPosition(
      this.$el.getElementsByClassName("welcome-message")[0],
      -750,
      -500
    );

    const l = (n: AbstractNode | undefined) => {
      this.selection = n;
    };

    Instance.getEngine(this.idOverview).setSelectionListener(l);

    WSUtils.Events.registerCallback(this.wsListener);
  },
  unmounted() {
    Instance.getEngine(this.idOverview).destroy();
    if (this.wsListener) {
      WSUtils.Events.unregisterCallback(this.wsListener);
    }
  },
  computed: {
    getShowUI(): boolean {
      return this.$store.getters.getShowUI;
    },
  },
  methods: {
    updateDivTransformation(value: { x: number; y: number; scale: number }) {
      this.panZoomInstance.moveTo(value.x, value.y);
      this.panZoomInstance.zoomAbs(value.x, value.y, value.scale);
    },
    panHappen: function (p: any, id: String) {
      p.setTransformOrigin(null);
      this.panZoomInstance = p;
      p.set;
      p.on("panzoompan", function (e: any) {});
      p.on("onDoubleClick", function (e: any) {
        return false;
      });
    },
    showAll(): void {
      Instance.getEngine(this.idOverview).zoomToFit();
    },
    deleteSelection(): void {
      let l: FolderOverviewEntry[] = Instance.getData(this.idOverview);

      if (Instance.getEngine(this.idOverview)) {
        const o = Instance.getEngine(this.idOverview);
        l = l.filter(
          (e) =>
            o.selection.filter((s) => s.entry && s.entry.id == e.id).length == 0
        );
        // update the data
        Instance.setData(this.idOverview, l);
        // tell the engine that we removed entries and clear selection
        Instance.getEngine(this.idOverview).rootNodes = l;
        Instance.getEngine(this.idOverview).clearSelection();
      }
    },
    mousedown(e: MouseEvent): void {
      const node = Instance.getEngine(this.idOverview).getNodeAtMousePosition();

      if (node) {
      }
    },
    setFocusToOverview(): void {
      if (WSUtils.doChangeFocus()) {
        setTimeout(() => {
          this.$el.focus();
        }, 2);
      }
    },
    paneButtonClicked(e: MouseEvent) {
      this.model.paneSize = this.model.paneSize <= 15 ? 50 : 100;
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
        if (Instance.getEngine(this.idOverview)) {
          for (
            let i = 0;
            i < Instance.getEngine(this.idOverview).rootNodes.length;
            i++
          ) {
            const entry: AbstractOverviewEntry = Instance.getEngine(
              this.idOverview
            ).rootNodes[i];

            for (let j = 0; j < entry.nodes.length; j++) {
              const n = entry.nodes[j];

              if (n.name.toLowerCase().includes(lowercase)) {
                nodesMatching.push(...n.parents(true));
              }
            }
          }
        }
        console.log(nodesMatching);

        Instance.getEngine(this.idOverview).setFilterList(
          "search",
          nodesMatching
        );
      } else {
        Instance.getEngine(this.idOverview).setFilterList("search");
      }
    },
    toggleShadowCanvas() {
      Instance.getEngine(this.idOverview).showShadowCanvas(
        !Instance.getEngine(this.idOverview).showShadow
      );

      console.log(Instance.getEngine(this.idOverview).rootNodes);
    },
    setMode1() {
      if (Instance.getEngine(this.idOverview)) {
        let maxV = 1024 * 1024 * 512;

        Instance.getEngine(this.idOverview).setColorScale<FolderNode>(
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
      if (Instance.getEngine(this.idOverview)) {
        let maxV = 1024 * 1024 * 50;

        Instance.getEngine(this.idOverview).setColorScale<FolderNode>(
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
      if (Instance.getEngine(this.idOverview)) {
        let n: FolderNode = Instance.getEngine(this.idOverview)
          .selection[0] as FolderNode;

        if (n && n.isCollection && n.entry) {
          n.entry.loadCollection(n);
        }
      }
    },
    createCollection() {
      if (Instance.getEngine(this.idOverview)) {
        let n: FolderNode = Instance.getEngine(this.idOverview)
          .selection[0] as FolderNode;
        !n.isCollection && n.parent ? n.createCollection() : 0;
      }
    },
    createRootFromNode() {
      if (Instance.getEngine(this.idOverview)) {
        let n: FolderNode = Instance.getEngine(this.idOverview)
          .selection[0] as FolderNode;
        this.addFolders([n.getPath()], { x: n.getX(), y: n.getY() });
      }
    },
    addEntries(entries: FolderOverviewEntry[], pos: { x: number; y: number }) {
      let listEntries: FolderOverviewEntry[] = Instance.getData(
        this.idOverview
      );

      console.log("add entries");

      entries.forEach((e) => {
        e.setCoordinates(pos);
        e.engine = Instance.getEngine(this.idOverview);
      });

      listEntries.push(...entries);
      /**
       * register the entries to the engine
       */
      if (Instance.getEngine(this.idOverview)) {
        Instance.getEngine(this.idOverview).rootNodes = listEntries;
      }

      /**
       * start syncing the folders in the entry.
       */
      for (let i = 0; i < listEntries.length; i++) {
        const e = listEntries[i];
        e.startWatcher();
      }
    },
    addFolders(listFolders: string[], pos: { x: number; y: number }) {
      let listEntries: FolderOverviewEntry[] = [];

      /**
       * create the entries based on the dropped files.
       */
      for (let index = 0; index < listFolders.length; index++) {
        const f = listFolders[index];
        const p = path.normalize(f).replace(/\\/g, "/");
        const fileStat = fs.lstatSync(p);
        if (fileStat.isDirectory()) {
          let root: FolderOverviewEntry = new FolderOverviewEntry(p);
          root.depth = 3;
          listEntries.push(root);
        }
      }
      this.addEntries(listEntries, pos);
    },
    drop(e: DragEvent) {
      let listFolders: string[] = [];

      /**
       * create the entries based on the dropped files.
       */
      if (e.dataTransfer && Instance.getEngine(this.idOverview)) {
        for (let index = 0; index < e.dataTransfer?.files.length; index++) {
          const f = e.dataTransfer?.files[index];
          listFolders.push(f.path);
        }

        this.addFolders(
          listFolders,
          Instance.getEngine(this.idOverview).screenToGraphCoords(e)
        );
      }
    },
  },
});
</script>


<style scoped lang="scss">
.vue-pan-zoom-item {
  width: 100%;
  height: 100%;
  z-index: 700;
  position: absolute;
  pointer-events: none;
}
</style>

<style   lang="scss">
.filter-settings {
  position: absolute;
  top: -1px;
  right: 24px;
  width: 32px;
  height: 70%;
  z-index: 9900;
  transition: all 0.2s ease-in-out;
  .slider {
    height: 100%;
    margin-top: 20px;
    transform-origin: top right;
    transform: scale(0.8);
  }
  .options {
    position: absolute;
    //  background: #fff;
    left: 100%;
    top: 0;
    height: 250px;
    width: 150px;
  }

  button {
    outline: none;
    color: white;
    border: none;
    padding: 0;
    margin: 0;
    background-color: transparent;
    svg {
      font-size: 26px;
    }
  }

  button:disabled,
  button[disabled] {
    pointer-events: none;
    color: #ffffff50;
    svg {
      transform: scale(0.7);
    }
  }
}

.filter-settings-hide {
  opacity: 0.2;
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
