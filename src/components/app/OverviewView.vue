<template>
  <div
    @mouseenter="setFocusToOverview()"
    @drop.capture="drop"
    @dragenter.stop.prevent
    @dragover.stop.prevent
    @keydown="keydown"
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
      <button>
        <CogOutline v-show="model.showFilterSettings" />
      </button>

      <div v-show="model.showFilterSettings" class="slider"></div>
      <div class="options">
        <h3>Features</h3>
        <component
          v-for="e in model.overview.features"
          :is="e.id"
          :name="e.id"
          :key="e.id"
          :entry="e"
          :workspace="this"
        >
        </component>

        <h3>Gradient Style</h3>
        <ColorGradient
          v-for="e in gradients"
          :class="{ 'gradient-selected': e === model.overview.gradientId }"
          :key="e.id"
          @mouseup="updateGradient(e.id)"
          :id="e.id"
          :gradient="e"
        />
      </div>
    </div>

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
        <!-- <div
          :class="{ 'blend-out': model.entries.length > 0 }"
          class="welcome-message"
        >
          <h2>
            Let's drop some Folders to get going!
            <EmoticonHappyOutline class="svg-smile" />
          </h2>
          <p>
            <FolderOutline class="svg-folder" />
          </p>
          <p><Download class="svg-download" /></p>
        </div> -->
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
          <button><RecordCircle @click="createCollection()" /></button>
          <template #content>Create Collection</template>
        </tippy>
        <tippy>
          <button><FileTree @click="loadCollection()" /></button>
          <template #content>Open Collection</template>
        </tippy>
        <tippy>
          <button><ContentCopy @click="createRootFromNode()" /></button>
          <template #content>Create Entry from Selection</template>
        </tippy>
        <tippy>
          <button :disabled="!deleteAllowed">
            <DeleteEmptyOutline @click="deleteSelection()" />
          </button>
          <template #content>Delete</template>
        </tippy>
      </tippy-singleton>
    </div>

    <button
      class="pane-button-ov"
      :class="{ 'workspace-menu-bar-hide': !getShowUI }"
    >
      <FormatHorizontalAlignCenter
        v-if="model.paneSize <= 15"
        @click="paneButtonClicked()"
      />
      <ArrowCollapseRight v-else @click="paneButtonClicked()" />
    </button>
  </div>
</template>

<script lang="ts">
const fs = require("fs");
import { Tippy, TippySingleton } from "vue-tippy";
import { ipcRenderer } from "electron";
import { Workspace } from "@/store/model/app/Workspace";
import { defineComponent } from "vue";
import noUiSlider, { API, PipsMode } from "nouislider";
import * as WSUtils from "./WorkspaceUtils";
import ColorGradient from "./ColorGradient.vue";
import { EngineState } from "./OverviewEngine";

import path from "path";
import {
  Pause,
  DeleteEmptyOutline,
  Qrcode,
  EmoticonHappyOutline,
  RecordCircle,
  Download,
  TuneVerticalVariant,
  ContentCopy,
  Overscan,
  FolderOutline,
  FormatHorizontalAlignCenter,
  CogOutline,
  FileTree,
  ArrowCollapseRight,
} from "mdue";
import { AbstractNode } from "../../store/model/app/overview/AbstractNode";
import * as d3 from "d3";
import _ from "underscore";
import { Instance } from "@/store/model/app/overview/OverviewDataCache";
import { AbstractNodeShell } from "@/store/model/app/overview/AbstractNodeShell";
import Gradient from "./Gradient";
import { filesizeFormat } from "@/utils/format";
import FolderNode from "@/store/model/implementations/filesystem/FolderNode";
import { FolderNodeShell } from "@/store/model/implementations/filesystem/FolderNodeShell";

const gradients: Gradient[] = [];
gradients.push(
  new Gradient((n: number) => {
    let value = n * 255 * 0.3;
    value = 180;
    return `rgb(${value},${value},${value})`;
  }, "default")
);
gradients.push(new Gradient(d3.interpolateWarm, "interpolateWarm"));
gradients.push(new Gradient(d3.interpolatePuRd, "interpolatePuRd", !true));
gradients.push(new Gradient(d3.interpolateMagma, "interpolateMagma", !true));

export default defineComponent({
  name: "App",
  components: {
    Tippy,
    TippySingleton,
    RecordCircle,
    CogOutline,
    Qrcode,
    FileTree,
    ColorGradient,
    ContentCopy,
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
    "model.isActive": function (newValue: boolean, oldValue: boolean) {
      if (Instance.getEngine(this.idOverview)) {
        Instance.getEngine(this.idOverview).enablePainting = newValue;
      }
    },
    "model.paneSize": function (newValue: number, oldValue: number) {
      this.model.overviewOpen = newValue < 100;
    },
    "selection.y": function (newValue: number, oldValue: number) {
      // funktioniert nicht
    },
    selection: function (
      newValue: AbstractNode | undefined,
      oldValue: AbstractNode | undefined
    ) {
      if (newValue instanceof FolderNode) {
        const fn: FolderNode = newValue;
        //  this.$emit("folderSelected", fn.getPath());
      } else {
        //  this.$emit("folderSelected", undefined);
      }
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
    sliderRange: (number | string)[];
    d3: any;
    gradients: Gradient[];
    state: EngineState;
    wsListener: WSUtils.Listener | undefined;
    idOverview: number;
    panZoomInstance: any;
    selection: AbstractNode | undefined;
    gradientFunction: Gradient;
  } {
    return {
      sliderRange: [0, 100],
      gradients: gradients,
      d3: d3,
      gradientFunction: gradients[2],
      selection: undefined,
      idOverview: 0,
      panZoomInstance: null,
      wsListener: undefined,
      state: new EngineState(),
    };
  },
  mounted() {
    const _this = this;

    /**
     * remove the node data from the vuex store
     */
    Instance.storeData(this.model);
    this.idOverview = this.model.id;

    Instance.createEngine(
      this.idOverview,
      this.$el.getElementsByClassName("overview-wrapper")[0],
      this.model
    );

    Instance.getEngine(this.idOverview).rootNodes = Instance.getData(
      this.idOverview
    );

    /**
     * Update the model coordinates with the current ones from the html view.
     */
    this.wsListener = {
      prepareFileSaving(): void {
        Instance.transferData(_this.model);
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

    // set3DPosition(
    //   this.$el.getElementsByClassName("welcome-message")[0],
    //   -750,
    //   -500
    // );

    const l = (n: AbstractNode | undefined) => {
      this.selection = n;
    };

    Instance.getEngine(this.idOverview).setSelectionListener(l);

    const sliderDiv = this.$el.getElementsByClassName("slider")[0];

    var slider = noUiSlider.create(sliderDiv, {
      start: [0, 1024 * 1024 * 1024 * 512],
      connect: true,
      behaviour: "drag",
      orientation: "vertical",
      tooltips: {
        to: filesizeFormat,
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
          to: filesizeFormat,
        },
      },
    });

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
        this.sliderRange = values;
        this.filterfunc(this, "size", Number(values[0]), Number(values[1]));
      }
    );

    this.updateGradient(this.model.overview.gradientId);

    WSUtils.Events.registerCallback(this.wsListener);
  },
  unmounted() {
    Instance.getEngine(this.idOverview).destroy();
    if (this.wsListener) {
      WSUtils.Events.unregisterCallback(this.wsListener);
    }
  },
  computed: {
    deleteAllowed(): boolean {
      return this.selection != undefined && this.selection.isRoot();
    },
    getShowUI(): boolean {
      return this.$store.getters.getShowUI;
    },
  },
  methods: {
    getGradienFunction(name: string): Gradient {
      let gradient: Gradient | undefined = gradients.find((g) => g.id == name);
      gradient = gradient ? gradient : gradients[0];

      return gradient;
    },
    filterfunc: _.throttle(
      (_this: any, stats: string, min: number, max: number) => {
        const colorFunction = (
          node: FolderNode,
          stat: number,
          min: number,
          max: number
        ) => {
          stat = stat < min ? 0 : stat > max ? max : stat;
          // console.log(
          //   stat,
          //   min,
          //   max,
          //   _this.gradientFunction.getColor(1 - stat / max)
          // );

          return stat < min || stat > max
            ? "h"
            : _this.gradientFunction.getColor(1 - stat / max);
        };

        /**
         * Sobald sich die Werte ändern, was eigentlich nur passiert wenn der filter angepasst wird? Dann ein event firen.
         *
         * Das muss dann von allen Files aufgegriffen werden um ihre Farbe zu aktualisieren.
         */
        WSUtils.Dispatcher.instance.featureEvent(
          stats,
          Number(min),
          Number(max),
          colorFunction
        );

        if (Instance.getEngine(_this.idOverview)) {
          Instance.getEngine(_this.idOverview).setColorScale<FolderNode>(
            stats,
            Number(min),
            Number(max),
            colorFunction,
            150
          );
        }
      },
      128
    ),
    /**
     * Für jede stats erstellen wir eine objekt instanz in der overview, die die einstellungen hat (min, max) und eine eindeutige id
     * Für jede stats brauchen wir eine componente die durch diese id geladen wird, wie bei den workspace entries
     * 
     * 
     * 
     * beim ändern des sliders ein emit machen mit den min/max
     *
     




     */
    updateGradient(name: string) {
      this.model.overview.gradientId = name;

      const gradient = this.getGradienFunction(name);
      this.gradientFunction = gradient;

      let values: string[] = [];
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const percent = Math.floor(100 * (i / steps));
        values.push(`${gradient.getColor(i / steps)} ${percent}%`);
      }

      const style = "linear-gradient( 0deg, " + values.join(", ") + ")";

      let divs: HTMLElement[] = this.$el.getElementsByClassName("noUi-connect");
      divs[0].style.backgroundImage = style;

      this.filterfunc(
        this,
        "size",
        Number(this.sliderRange[0]),
        Number(this.sliderRange[1])
      );
    },
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
      let l: AbstractNodeShell[] = Instance.getData(this.idOverview);

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
    keydown(e: KeyboardEvent) {
      let node: AbstractNode | undefined =
        Instance.getEngine(this.idOverview).selection.length > 0
          ? Instance.getEngine(this.idOverview).selection[0]
          : undefined; 

      switch (e.key) {
        case "+":
          this.loadCollection();
          break;
        case "-":
          this.createCollection();
          break;
        case "ArrowUp":
          if (node && node.parent) {
            const childrenSorted = node.parent
              .getChildren()
              .sort((a, b) => a.getY() - b.getY());
            const i = childrenSorted.indexOf(node);
            const next = i - 1 < 0 ? childrenSorted.length - 1 : i - 1;
            Instance.getEngine(this.idOverview).updateSelection(
              false,
              childrenSorted[next]
            );
          }
          break;
        case "ArrowLeft":
          if (node && node.parent) {
            Instance.getEngine(this.idOverview).updateSelection(
              false,
              node.parent
            );
          }
          break;
        case "ArrowDown":
          if (node && node.parent) {
            const childrenSorted = node.parent
              .getChildren()
              .sort((a, b) => a.getY() - b.getY());
            const i = childrenSorted.indexOf(node);
            const next = i + 1 > childrenSorted.length - 1 ? 0 : i + 1;
            Instance.getEngine(this.idOverview).updateSelection(
              false,
              childrenSorted[next]
            );
          }
          break;
        case "ArrowRight":
          if (node && node.getChildren().length > 0) {
            Instance.getEngine(this.idOverview).updateSelection(
              false,
              node.getChildren()[0]
            );
          }
          break;
        default:
          break;
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
            const entry: AbstractNodeShell = Instance.getEngine(this.idOverview)
              .rootNodes[i];

            for (let j = 0; j < entry.nodes.length; j++) {
              const n = entry.nodes[j];

              if (n.name.toLowerCase().includes(lowercase)) {
                nodesMatching.push(...n.parents(true));
              }
            }
          }
        }

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
    addEntries(entries: FolderNodeShell[], pos: { x: number; y: number }) {
      let listEntries: AbstractNodeShell[] = Instance.getData(this.idOverview);

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
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        e.startWatcher();
      }
    },
    addFolders(listFolders: string[], pos: { x: number; y: number }) {
      let listEntries: FolderNodeShell[] = [];

      /**
       * create the entries based on the dropped files.
       */
      for (let index = 0; index < listFolders.length; index++) {
        const f = listFolders[index];
        const p = path.normalize(f).replace(/\\/g, "/");
        const fileStat = fs.lstatSync(p);
        if (fileStat.isDirectory()) {
          let root: FolderNodeShell = new FolderNodeShell(p);
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
  top: 30px;
  right: 24px;
  width: 20px;
  height: 70%;
  z-index: 9900;
  transition: all 0.2s ease-in-out;
  .slider {
    height: 100%;
    margin-top: 60px;
    transform-origin: top right;
    transform: scale(0.8);
  }
  .options {
    h3 {
      margin: 15px 0 5px 0;
    }
    position: absolute;
    right: calc(100% + 90px);
    top: 15px;
    min-height: 250px;
    min-width: 200px;
    background: gray;
    padding: 10px;
    border-radius: 2px;
  }

  button {
    position: absolute;
    outline: none;
    color: white;
    border: none;
    padding: 0;
    margin: 0;
    background-color: transparent;
    top: 5px;
    svg {
      font-size: 26px;
      margin: 0;
    }
  }
  button:nth-child(1) {
    right: -10px;
  }
  button:nth-child(2) {
    right: 20px;
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

.overview-canvas {
  pointer-events: all !important;
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
    -ms-interpolation-mode: nearest-neighbor;
  }
}
</style>
