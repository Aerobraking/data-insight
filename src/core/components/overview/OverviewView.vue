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
      <select
        class="feature-select-list"
        v-model="model.overview.featureActive"
      >
        <option
          class="feature-select"
          v-for="e in listFeatures"
          :key="e.id"
          :value="e.id"
          :class="{ selected: model.overview.featureActive == e.id }"
        >
          {{ e.readableName }}
        </option>
      </select>
      <button class="show-filter-settings">
        <TuneVerticalVariant
          @click="model.showFilterSettings = !model.showFilterSettings"
        />
      </button>

      <div v-show="model.showFilterSettings" class="feature-view-list">
        <keep-alive>
          <component
            class="feature-view"
            v-for="e in listFeatures"
            :key="e.id"
            :model="e"
            :workspace="model"
            :selection="selection"
            :is="e.id"
            ref="featureview"
            v-show="model.overview.featureActive == e.id"
          >
          </component>
        </keep-alive>
      </div>
    </div>

    <div class="overview-wrapper" @mousedown="mousedown"></div>

    <div
      @mousedown.stop
      @dblclick.capture.stop
      class="workspace-menu-bar"
      :class="{ 'workspace-menu-bar-hide': !getShowUI }"
    >
      <tippy-singleton
        :moveTransition="'transform 0.2s ease-out'"
        :offset="[0, 40]"
      >
        <tippy>
          <button :class="{ 'button-active': model.overview.showAll }">
            <Overscan
              @click.ctrl.left.exact="showAll()"
              @click.left.exact="showAll(false)"
            />
          </button>
          <template #content
            >Show All <kbd>Ctrl</kbd>|<kbd>Space</kbd></template
          >
        </tippy>
        <tippy>
          <button
            :class="{ 'button-active': model.overview.highlightSelection }"
          >
            <Flashlight @click.left.exact="toggleHighlight()" />
          </button>
          <template #content>Highlight Selection <kbd>h</kbd></template>
        </tippy>
        <tippy>
          <button><FolderOutline @click="selectFolders()" /></button>
          <template #content>Add Folders</template>
        </tippy>

        <tippy>
          <button :disabled="!nodeCollapsable">
            <RecordCircle
              @click.exact="createCollection()"
              @click.ctrl.exact="createCollection(true)"
            />
          </button>
          <template #content
            >Create Collection <kbd>Ctrl</kbd>|<kbd>-</kbd></template
          >
        </tippy>
        <tippy>
          <button :disabled="isContainer">
            <FileTree
              @click.exact="loadCollection()"
              @click.ctrl.exact="loadCollection(true)"
            />
          </button>
          <template #content
            >Open Collection <kbd>Ctrl</kbd>|<kbd>+</kbd></template
          >
        </tippy>
        <tippy>
          <button :disabled="!nodeSelected">
            <ContentCopy @click="createRootFromNode()" />
          </button>
          <template #content
            >Create Entry from Selection <kbd>Shift</kbd>+<kbd
              >Drag Selection</kbd
            ></template
          >
        </tippy>
        <tippy>
          <button :disabled="!deleteAllowed">
            <DeleteEmptyOutline @click="deleteSelection()" />
          </button>
          <template #content>Delete <kbd>Del</kbd></template>
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
/*
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

*/
import fs from "fs";
import { Tippy, TippySingleton } from "vue-tippy";
import { ipcRenderer } from "electron";
import { Workspace } from "@/core/model/Workspace";
import { defineComponent } from "vue";
import * as WSUtils from "./../workspace/WorkspaceUtils";
import ColorGradient from "./ColorGradient.vue";
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
  Flashlight,
  Overscan,
  FolderOutline,
  FormatHorizontalAlignCenter,
  CogOutline,
  FileTree,
  ArrowCollapseRight,
} from "mdue";
import { AbstractNode } from "@/core/model/overview/AbstractNode";
import { Feature } from "@/core/model/overview/AbstractNodeFeature";
import { AbstractNodeFeature } from "@/core/model/overview/AbstractNodeFeatureView";
import { AbstractNodeShell } from "@/core/model/overview/AbstractNodeShell";
import { Instance } from "@/core/model/overview/OverviewDataCache";
import FolderNode from "@/filesystem/model/FolderNode";
import { FolderNodeShell } from "@/filesystem/model/FolderNodeShell";
import * as d3 from "d3";
import { getFeatureList } from "../features/FeatureList";
import { Layouter } from "@/core/model/overview/NodeLayout";
import { doBenchmark, start } from "@/core/utils/Benchmark";

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
    Flashlight,
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
      if (Instance.getEngine(this.id)) {
        Instance.getEngine(this.id).enablePainting = newValue;
      }
    },
    "model.paneSize": function (newValue: number, oldValue: number) {
      this.model.overviewOpen = newValue < 100;
    },
    "selection.y": function (newValue: number, oldValue: number) {
      // funktioniert nicht
    },
    "model.overview.featureActive": function (
      newValue: Feature | undefined,
      oldValue: Feature | undefined
    ) {
      this.setRender();
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
    wsListener: WSUtils.Listener | undefined;
    id: number;
    panZoomInstance: any;
    selection: AbstractNode | undefined;
    listFeatures: AbstractNodeFeature[];
  } {
    return {
      listFeatures: [],
      sliderRange: [0, 100],
      d3: d3,
      selection: undefined,
      id: 0,
      panZoomInstance: null,
      wsListener: undefined,
    };
  },
  mounted() {
    const _this = this;
    /**
     * remove the node data from the vuex store
     */
    Instance.storeData(this.model);
    this.id = this.model.id;

    Instance.createEngine(
      this.id,
      this.$el.getElementsByClassName("overview-wrapper")[0],
      this.model
    );

    /**
     * Set engine for existing nodes
     */
    Instance.getData(this.id).forEach((e) => {
      e.engine = Instance.getEngine(this.id);
    });

    /**
     * Get all Features and add them to the list so the views for them will be created.
     * Each feature has to get a viewsettings instance that is stored in the overview.
     *
     */
    const listFeatures = getFeatureList();

    /**
     * get the settings from the overview to the view. when no settings exists, create a new instance.
     */
    for (let i = 0; i < listFeatures.length; i++) {
      const f = listFeatures[i];
      const settings = this.model.overview.featureSettings[f.id];
      f.settings = settings ? settings : f.getNewSettingsInstance();
      this.model.overview.featureSettings[f.id] = f.settings;
      this.listFeatures.push(f);
    }

    this.setRender();

    /**
     * Set the data after the render is set.
     */
    Instance.getEngine(this.id).rootNodes = Instance.getData(this.id);

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

    Instance.getEngine(this.id).setSelectionListener(l);

    WSUtils.Events.registerCallback(this.wsListener);
  },
  unmounted() {
    if (Instance.getEngine(this.id)) Instance.getEngine(this.id).dispose();
    if (this.wsListener) {
      WSUtils.Events.unregisterCallback(this.wsListener);
    }
  },
  computed: {
    deleteAllowed(): boolean {
      return this.selection != undefined && this.selection.isRoot();
    },
    nodeSelected(): boolean {
      return this.selection != undefined && !this.selection.isRoot();
    },
    nodeCollapsable(): boolean {
      return (
        this.selection != undefined &&
        !this.selection.isRoot() &&
        this.selection.children.length > 0 &&
        !this.selection.isCollection()
      );
    },
    isContainer(): boolean {
      return this.selection != undefined && !this.selection.isCollection();
    },
    getShowUI(): boolean {
      return this.$store.getters.getShowUI;
    },
  },
  methods: {
    toggleHighlight() {
      this.model.overview.highlightSelection =
        !this.model.overview.highlightSelection;
      Instance.getEngine(this.model.id).updateSelection(false);
    },
    setRender() {
      if (Instance.getEngine(this.model.id)) {
        const nonreactiveInstances = getFeatureList();

        for (let i = 0; i < this.listFeatures.length; i++) {
          const f = this.listFeatures[i];

          if (f.id == this.model.overview.featureActive) {
            nonreactiveInstances[i].settings = f.settings;
            JSON.parse(JSON.stringify(f.settings));

            // set render engine
            Instance.getEngine(this.model.id).setFeatureRender(
              nonreactiveInstances[i]
            );
            return;
          }
        }
      }
    },
    updateDivTransformation(value: { x: number; y: number; scale: number }) {
      // this.panZoomInstance.moveTo(value.x, value.y);
      // this.panZoomInstance.zoomAbs(value.x, value.y, value.scale);
    },
    panHappen: function (p: any, id: String) {
      /*p.setTransformOrigin(null);
      // this.panZoomInstance = p;
      // p.set;
      // p.on("panzoompan", function (e: any) {});
      // p.on("onDoubleClick", function (e: any) {
      //   return false;
      // });*/
    },
    showAll(automodeToggle: boolean = true): void {
      if (!automodeToggle) {
        this.model.overview.showAll = false;
        Instance.getEngine(this.id).zoomToFit(400);
        return;
      }
      if (!this.model.overview.showAll) {
        setTimeout(() => {
          this.model.overview.showAll = true;
        }, 10);
      } else {
        this.model.overview.showAll = false;
      }
    },
    deleteSelection(): void {
      let l: AbstractNodeShell[] = Instance.getData(this.id);

      if (Instance.getEngine(this.id)) {
        const o = Instance.getEngine(this.id);
        l = l.filter(
          (e) =>
            o.selection.filter((s) => s.shell && s.shell.id == e.id).length == 0
        );
        // update the data
        Instance.setData(this.id, l);
        // tell the engine that we removed entries and clear selection
        Instance.getEngine(this.id).rootNodes = l;
        Instance.getEngine(this.id).clearSelection();
      }
    },
    mousedown(e: MouseEvent): void {
      const node = Instance.getEngine(this.id).getNodeAtMousePosition();

      if (node) {
      }
    },
    keydown(e: KeyboardEvent) {
      let node: AbstractNode | undefined =
        Instance.getEngine(this.id).selection.length > 0
          ? Instance.getEngine(this.id).selection[0]
          : undefined;

      const padding = 50,
        dur = 200;
      /**
       * Arrow key navigation
       */
      switch (e.key) {
        case "ArrowUp":
          if (node && node.parent) {
            let childrenSorted = node.parent
              .getChildren()
              .sort((a, b) => a.getY() - b.getY());
            let i = childrenSorted.indexOf(node);
            if (i - 1 < 0) {
              if (node.parent.parent) {
                childrenSorted = [];

                node.parent.parent.children.forEach((p) =>
                  childrenSorted.push(...p.children)
                );
                childrenSorted.sort((a, b) => a.getY() - b.getY());
                i = childrenSorted.indexOf(node);
              }
            }
            const next = i - 1 < 0 ? childrenSorted.length - 1 : i - 1;
            Instance.getEngine(this.id).updateSelection(
              false,
              childrenSorted[next]
            );

            if (e.ctrlKey)
              Instance.getEngine(this.id).zoomToFitSelection(
                200,
                false,
                padding
              );
            return;
          }
          break;
        case "ArrowLeft":
          if (node && node.parent) {
            Instance.getEngine(this.id).updateSelection(false, node.parent);
            if (e.ctrlKey)
              Instance.getEngine(this.id).zoomToFitSelection(
                200,
                false,
                padding
              );
            return;
          }
          break;
        case "ArrowDown":
          if (node && node.parent) {
            let childrenSorted = node.parent
              .getChildren()
              .sort((a, b) => a.getY() - b.getY());
            let i = childrenSorted.indexOf(node);
            if (i + 1 > childrenSorted.length - 1) {
              if (node.parent.parent) {
                childrenSorted = [];

                node.parent.parent.children.forEach((p) =>
                  childrenSorted.push(...p.children)
                );
                childrenSorted.sort((a, b) => a.getY() - b.getY());
                i = childrenSorted.indexOf(node);
              }
            }
            const next = i + 1 > childrenSorted.length - 1 ? 0 : i + 1;
            Instance.getEngine(this.id).updateSelection(
              false,
              childrenSorted[next]
            );
            if (e.ctrlKey)
              Instance.getEngine(this.id).zoomToFitSelection(
                200,
                false,
                padding
              );
            return;
          }
          break;
        case "ArrowRight":
          if (node && node.getChildren().length > 0) {
            Instance.getEngine(this.id).updateSelection(
              false,
              node.getChildren()[0]
            );
            if (e.ctrlKey)
              Instance.getEngine(this.id).zoomToFitSelection(
                200,
                false,
                padding
              );
            return;
          }
          break;
      }

      // no modifier
      if (!e.shiftKey && !e.altKey && !e.ctrlKey) {
        switch (e.key) {
          case "Tab":
            for (let i = 0; i < this.listFeatures.length; i++) {
              const f = this.listFeatures[i];
              if (f.id == this.model.overview.featureActive) {
                i++;
                const fNew =
                  this.listFeatures[i > this.listFeatures.length - 1 ? 0 : i];
                this.model.overview.featureActive = fNew.id;
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            }
            break;
          case "Delete":
          case "delete":
            this.deleteSelection();
            break;
          case "h":
            if (doBenchmark) Instance.getEngine(this.id).toggleCulling();
            break;
          case "c":
            if (doBenchmark) Instance.getEngine(this.id).toggleCulling();
            break;
          case "l":
            if (doBenchmark) start("layout");
            for (let index = 0; index < 100; index++) {
              Layouter.nodesUpdated(Instance.getEngine(this.id).rootNodes[0]);
            }
            if (doBenchmark) start("layout", "time for layouting");

            let nodes = 0;

            for (
              let i = 0;
              i < Instance.getEngine(this.id).rootNodes.length;
              i++
            ) {
              const l = Instance.getEngine(this.id).rootNodes[i].nodes.length;
              nodes += l;
              console.log(i, l);
            }
            console.log("Nodes: ", nodes);
            break;
          case " ":
            this.showAll(false);
            break;
          case "h":
            this.toggleHighlight();
            break;
          case "+":
            this.loadCollection();
            break;
          case "-":
            this.createCollection();
            break;
          default:
            break;
        }
      }

      // ctrl modifier
      if (!e.shiftKey && !e.altKey && e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case " ":
            this.showAll(false);
            break;
          case "f":
            this.$emit("focusSearch");
          default:
            break;
          case "+":
            this.loadCollection(true);
            break;
          case "-":
            this.createCollection(true);
            break;
        }
      }

      // shift modifier
      if (e.shiftKey && !e.altKey && !e.ctrlKey) {
        switch (e.key) {
          case " ":
            this.model.overview.showAll = false;
            Instance.getEngine(this.id).zoomToFitSelection(600);
            break;
          case "Tab":
            for (let i = 0; i < this.listFeatures.length; i++) {
              const f = this.listFeatures[i];
              if (f.id == this.model.overview.featureActive) {
                i--;
                const fNew =
                  this.listFeatures[i < 0 ? this.listFeatures.length - 1 : i];
                this.model.overview.featureActive = fNew.id;
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            }
            break;
          default:
            break;
        }
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
        if (Instance.getEngine(this.id)) {
          for (
            let i = 0;
            i < Instance.getEngine(this.id).rootNodes.length;
            i++
          ) {
            const entry: AbstractNodeShell = Instance.getEngine(this.id)
              .rootNodes[i];

            for (let j = 0; j < entry.nodes.length; j++) {
              const n = entry.nodes[j];

              if (n.name.toLowerCase().includes(lowercase)) {
                nodesMatching.push(...n.parents(true));
              }
            }
          }
        }

        Instance.getEngine(this.id).setFilterList("search", nodesMatching);
      } else {
        Instance.getEngine(this.id).setFilterList("search");
      }
    },
    loadCollection(useSavedDepth: boolean = false) {
      if (Instance.getEngine(this.id)) {
        let n: AbstractNode = Instance.getEngine(this.id).selection[0];

        if (n && n.shell) {
          if (n.isCollection()) {
            n.shell.loadCollection(n, useSavedDepth);
          } else {
            n.descendants()
              .filter((c) => c.isCollection())
              .forEach((c) => n.shell?.loadCollection(c, useSavedDepth));
          }
        }

        /**
         * A dirty hack to update the computed property on the selection, as the synced subfolders will be added after the syncing that takes some time. For huge folders this may not work.
         */
        // setTimeout(() => {
        //   const t = this.selection;
        //   this.selection = undefined;
        //   this.selection = t;
        // }, 100);
      }
    },
    createCollection(complete: boolean = false) {
      if (Instance.getEngine(this.id)) {
        let n: AbstractNode | undefined = Instance.getEngine(this.id)
          .selection[0];

        if (n) n.createCollection(complete);

        const t = this.selection;
        this.selection = undefined;
        this.selection = t;
      }
    },
    createRootFromNode() {
      if (Instance.getEngine(this.id)) {
        let n: FolderNode = Instance.getEngine(this.id)
          .selection[0] as FolderNode;
        this.addFolders([n.getPath()], { x: n.getX(), y: n.getY() });
      }
    },
    addEntries(entries: FolderNodeShell[], pos: { x: number; y: number }) {
      let listEntries: AbstractNodeShell[] = Instance.getData(this.id);

      entries.forEach((e) => {
        e.setCoordinates(pos);
        e.engine = Instance.getEngine(this.id);
      });

      listEntries.push(...entries);
      /**
       * register the entries to the engine
       */
      if (Instance.getEngine(this.id)) {
        Instance.getEngine(this.id).rootNodes = listEntries;
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
      if (listEntries.length > 0) {
        this.addEntries(listEntries, pos);
        // setTimeout(() => {
        //   Instance.getEngine(this.id).selection = [
        //     listEntries[listEntries.length - 1].root,
        //   ];
        // }, 33);
      }
    },
    drop(e: DragEvent) {
      let listFolders: string[] = [];

      /**
       * create the entries based on the dropped files.
       */
      if (e.dataTransfer && Instance.getEngine(this.id)) {
        for (let index = 0; index < e.dataTransfer?.files.length; index++) {
          const f = e.dataTransfer?.files[index];
          listFolders.push(f.path);
        }

        this.addFolders(
          listFolders,
          Instance.getEngine(this.id).screenToGraphCoords(e)
        );
      }
    },
  },
});
</script>


<style scoped lang="scss">
.feature-view-list {
  height: 100%;
  margin-top: 60px;
}
.feature-select-list {
  position: absolute;
  right: 30px;
  top: 7px;
  height: 22px;
  color: white;
  background: transparent;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  outline: none;

  option {
    background-color: #333;
    border: none;
    white-space: nowrap;
    color: white;
    padding: 5px;
    margin: 5px;
    height: 30px;
  }
}

.vue-pan-zoom-item {
  width: 100%;
  height: 100%;
  z-index: 700;
  position: absolute;
  pointer-events: none;
}
</style>

<style lang="scss">
.filter-settings {
  position: absolute;
  top: 1px;
  right: 24px;
  width: 20px;
  height: 70%;
  z-index: 9900;
  transition: color 0.2s ease-in-out;

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

  .show-filter-settings {
    position: absolute;
    outline: none;
    color: white;
    border: none;
    padding: 0;
    margin: 0;
    background-color: transparent;
    top: 0px;

    right: -10px;
  }

  svg {
    font-size: 26px;
    margin: 0;
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
