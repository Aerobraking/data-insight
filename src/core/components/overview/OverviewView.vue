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
      :class="{ 'filter-settings-hide': !model.showFeatureSettings }"
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
          @click="model.showFeatureSettings = !model.showFeatureSettings"
        />
      </button>

      <div v-show="model.showFeatureSettings" class="feature-view-list">
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
          <button :disabled="!collectionCreatable">
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
          <button :disabled="isCollection">
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
/**
 * Displays the Overview of an activity.
 * This is made up of an Canvas for rendering the trees and some
 * buttons for the UI.
 * It also Creates the UI for the Feature Settings.
 */
import fs from "fs";
import { Tippy, TippySingleton } from "vue-tippy";
import { ipcRenderer } from "electron";
import { Workspace } from "@/core/model/workspace/Workspace";
import { defineComponent } from "vue";
import * as WSUtils from "@/core/utils/WorkspaceUtils";
import ColorGradient from "./ColorGradient.vue";
import path from "path";
import {
  DeleteEmptyOutline,
  RecordCircle,
  TuneVerticalVariant,
  ContentCopy,
  Flashlight,
  Overscan,
  FolderOutline,
  FormatHorizontalAlignCenter,
  FileTree,
  ArrowCollapseRight,
} from "mdue";
import { AbstractNode } from "@/core/model/workspace/overview/AbstractNode";
import {
  AbstractFeature,
  getFeatureList,
} from "@/core/model/workspace/overview/AbstractFeature";
import { AbstractNodeTree } from "@/core/model/workspace/overview/AbstractNodeTree";
import { Instance } from "@/core/model/workspace/overview/OverviewDataCache";
import FolderNode from "@/filesystem/model/FolderNode";
import { FolderNodeTree } from "@/filesystem/model/FolderNodeTree";
import { FeatureType } from "@/core/model/workspace/overview/FeatureType";
import {
  createKeyboardInputContext,
  PluginShortCutHandler,
} from "@/core/plugin/KeyboardShortcut";
import { getPlugins } from "@/plugins/PluginList";
import AbstractPlugin from "@/core/plugin/AbstractPlugin";
import { removeFromList } from "@/core/utils/ListUtils";

/**
 * This import loads Instances for all Feature Classes, so don't remove it.
 */
import { initAllFeatures } from "../../model/workspace/overview/FeatureList";

export default defineComponent({
  name: "App",
  components: {
    Tippy,
    TippySingleton,
    RecordCircle,
    FileTree,
    ColorGradient,
    ContentCopy,
    Flashlight,
    TuneVerticalVariant,
    Overscan,
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
        Instance.getEngine(this.id).enableRendering = newValue;
      }
    },
    "model.paneSize": function (newValue: number, oldValue: number) {
      setTimeout(() => {
        this.model.overviewOpen = newValue < 100;
      }, 500);
    },
    /**
     * When the id of the active Feature changes, update the view
     * to load the appropiate view for the now active feature.
     */
    "model.overview.featureActive": function (
      newValue: FeatureType | undefined,
      oldValue: FeatureType | undefined
    ) {
      this.setRender();
    },
    selection: function (
      newValue: AbstractNode | undefined,
      oldValue: AbstractNode | undefined
    ) {
      // used for connecting a selected FolderNode to a FolderView in the future.
    },
    searchstring: function (newValue: String, oldValue: String) {
      this.searchUpdate();
    },
  },
  data(): {
    /**
     *
     */
    wsListener: WSUtils.WorkspaceViewListener | undefined;
    /**
     * Stores the id of the workspace for easier access
     */
    id: number;
    /**
     * The current selected Node Object in the Overview,
     * or undefined when none is selected.
     */
    selection: AbstractNode | undefined;
    /**
     * Contains for each existing class that extends from AbstractFeature
     * An Instance.
     */
    listFeatures: AbstractFeature[];
    /**
     * Handles the activiation of the plugins by the
     * keyboard inputs.
     */
    pluginShortCutHandler: PluginShortCutHandler | undefined;
  } {
    return {
      listFeatures: [],
      selection: undefined,
      id: 0,
      wsListener: undefined,
      pluginShortCutHandler: undefined,
    };
  },
  mounted() {
    const _this = this;

    this.pluginShortCutHandler = createKeyboardInputContext({
      debounceTime: 100,
      autoEnable: true,
    });

    // register all plugins to the shortcut handler.
    getPlugins().forEach((p) => {
      const plugin = new p();
      if (this.pluginShortCutHandler)
        this.pluginShortCutHandler.register(plugin.shortcut, () => {
          this.startPlugin(plugin);
        });
    });

    /**
     * remove the node data from the vuex store
     */
    Instance.storeData(this.model);
    this.id = this.model.id;

    /**
     * Create the OverviewEngine Instance for this overview model instance.
     */
    Instance.createEngine(
      this.id,
      this.$el.getElementsByClassName("overview-wrapper")[0],
      this.model
    );

    /**
     * Set engine for existing nodes.
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
     * transfer the settings from the overview to the view. when no settings exists, create a new instance.
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
    Instance.getEngine(this.id).trees = [...Instance.getData(this.id)];

    /**
     * Update the model coordinates with the current ones from the html view.
     */
    this.wsListener = {
      prepareFileSaving(): void {
        Instance.restoreData(_this.model);
      },
    };

    /**
     * When folders were selected in the main process, add them as trees to the overview.
     */
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

    /**
     * Listen to the selection change in the OverviewEngine to update
     * it here in the Component.
     */
    Instance.getEngine(this.id).setSelectionListener(
      (n: AbstractNode | undefined) => {
        this.selection = n;
      }
    );

    WSUtils.Events.registerCallback(this.wsListener);
  },
  unmounted() {
    /**
     * When the Component gets unmounted then we can also stop the OverviewEngine
     * because in this case the Overview was deleted or the InsightFile was closed.
     */
    if (Instance.getEngine(this.id)) Instance.getEngine(this.id).dispose();
    if (this.wsListener) {
      WSUtils.Events.unregisterCallback(this.wsListener);
    }
  },
  computed: {
    /**
     * @return: true A root node of a tree is selected. false: otherwise.
     */
    deleteAllowed(): boolean {
      return this.selection != undefined && this.selection.isRoot();
    },
    /**
     * @return: true a node is selected that is NOT the root node, false otherwise.
     */
    nodeSelected(): boolean {
      return this.selection != undefined && !this.selection.isRoot();
    },
    /**
     * @return: true if the selected node can be converted to a collection, false otherwise.
     */
    collectionCreatable(): boolean {
      return (
        this.selection != undefined &&
        !this.selection.isRoot() &&
        this.selection.children.length > 0 &&
        !this.selection.isCollection()
      );
    },
    /**
     * @return: true if the selected node is a collection node, false otherwise.
     */
    isCollection(): boolean {
      return this.selection != undefined && !this.selection.isCollection();
    },
    /**
     * @return true if the UI should be visible, false when certain UI Elements should be
     * hidden for the "distract free mode"
     */
    getShowUI(): boolean {
      return this.$store.getters.getShowUI;
    },
  },
  inject: ["getWorkspaceIfc"],
  methods: {
    /**
     * Starts the given Plugin instance.
     */
    startPlugin(p: AbstractPlugin): void {
      // @ts-ignore: Unreachable code error
      p.setWorkspace(this.getWorkspaceIfc());
      p.init();
      WSUtils.Events.pluginStarted(p.isModal());
    },
    /**
     * Toggle the highlighting of the related tree parts of the selected node.
     */
    toggleHighlight() {
      this.model.overview.highlightSelection =
        !this.model.overview.highlightSelection;
      Instance.getEngine(this.model.id).updateSelection(false);
    },
    /**
     *
     */
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
    /**
     *
     * @param automodeToggle true: the view will be updated each frame so all trees are visible,
     * false: the view will be updated once so all trees are visible. true by default.
     */
    showAll(automodeToggle: boolean = true): void {
      if (!automodeToggle) {
        this.model.overview.showAll = false;
        Instance.getEngine(this.id).zoomToFitAll(400);
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
    /**
     * Deletes the tree of the selected node, when this node is the root node.
     */
    deleteSelection(): void {
      let l: AbstractNodeTree[] = Instance.getData(this.id);
      const e = Instance.getEngine(this.id);
      if (e) {
        if (e.selection.length > 0 && e.selection[0].isRoot()) {
          // update the data
          removeFromList(l, e.selection[0].tree);
          Instance.setData(this.id, l);
          // tell the engine that we removed entries and clear selection
          e.clearSelection();
          e.trees = l;
        }
      }
    },
    mousedown(e: MouseEvent): void {
      const node = Instance.getEngine(this.id).getNodeAtMousePosition();
    },
    keydown(e: KeyboardEvent) {
      /**
       * Key events in the overview will be transferd to the PluginShortCutHandler
       * with the overview context string "ov"
       */
      if (this.pluginShortCutHandler)
        this.pluginShortCutHandler.keydown("ov", e);

      let node: AbstractNode | undefined =
        Instance.getEngine(this.id).selection.length > 0
          ? Instance.getEngine(this.id).selection[0]
          : undefined;

      const padding = 50;
      /**
       * Arrow key navigation through the tree.
       */
      switch (e.key) {
        case "ArrowUp":
          if (node && node.parent) {
            let childrenSorted = node.parent.children.sort((a, b) => a.y - b.y);
            let i = childrenSorted.indexOf(node);
            if (i - 1 < 0) {
              if (node.parent.parent) {
                childrenSorted = [];

                node.parent.parent.children.forEach((p) =>
                  childrenSorted.push(...p.children)
                );
                childrenSorted.sort((a, b) => a.y - b.y);
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
            let childrenSorted = node.parent.children.sort((a, b) => a.y - b.y);
            let i = childrenSorted.indexOf(node);
            if (i + 1 > childrenSorted.length - 1) {
              if (node.parent.parent) {
                childrenSorted = [];

                node.parent.parent.children.forEach((p) =>
                  childrenSorted.push(...p.children)
                );
                childrenSorted.sort((a, b) => a.y - b.y);
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
          if (node && node.children.length > 0) {
            Instance.getEngine(this.id).updateSelection(
              false,
              node.children[0]
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
          // switch through the active features.
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
            this.toggleHighlight();
            break;
          case " ":
            this.showAll(false);
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
    /**
     * Set the Focus for the HTML View to the $el of this component. Is necessary so
     * the Inputevents will be captured correctly. So it should be called when
     * the mouse is inside this component.
     */
    setFocusToOverview(): void {
      if (WSUtils.doChangeFocus()) {
        setTimeout(() => {
          this.$el.focus();
        }, 2);
      }
    },
    /**
     * Updates the pane position.
     */
    paneButtonClicked(e: MouseEvent) {
      this.model.paneSize = this.model.paneSize <= 15 ? 50 : 100;
    },
    /**
     * Start the selection of folders via an Dialog.
     */
    selectFolders() {
      ipcRenderer.send("select-files", {
        target: "o" + this.model.id,
        type: "folders",
        path: this.model.folderSelectionPath,
      });
    },
    /**
     * Call this method when the search string was updated.
     * It searches for all nodes that fit to the search string
     * and updates the filtering in the OverviewEngine with these nodes.
     */
    searchUpdate() {
      let lowercase = this.searchstring.toLowerCase().trim();
      let nodesMatching: AbstractNode[] = [];

      if (lowercase.length > 0) {
        if (Instance.getEngine(this.id)) {
          for (let i = 0; i < Instance.getEngine(this.id).trees.length; i++) {
            const tree: AbstractNodeTree = Instance.getEngine(this.id).trees[i];

            for (let j = 0; j < tree.nodes.length; j++) {
              const n = tree.nodes[j];

              if (n.name.toLowerCase().includes(lowercase)) {
                nodesMatching.push(...n.getAncestors(true));
              }
            }
          }
        }

        Instance.getEngine(this.id).setFilterList("search", nodesMatching);
      } else {
        Instance.getEngine(this.id).setFilterList("search");
      }
    },
    /**
     * Open the selected Collection node.
     * @param useSavedDepth: true, use the load depth that is saved inside the node,
     * false: only open with depth of 1.
     */
    loadCollection(useSavedDepth: boolean = false) {
      if (Instance.getEngine(this.id)) {
        let n: AbstractNode = Instance.getEngine(this.id).selection[0];

        if (n && n.tree) {
          if (n.isCollection()) {
            n.tree.loadCollection(n, useSavedDepth);
          } else {
            n.getDescendants()
              .filter((c) => c.isCollection())
              .forEach((c) => n.tree?.loadCollection(c, useSavedDepth));
          }
        }
      }
    },
    /**
     * Create a collection node out of the selected node.
     */
    createCollection(complete: boolean = false): void {
      if (Instance.getEngine(this.id)) {
        let n: AbstractNode | undefined = Instance.getEngine(this.id)
          .selection[0];

        if (n) n.createCollection(complete);

        const t = this.selection;
        this.selection = undefined;
        this.selection = t;
      }
    },
    /**
     * Creates a new tree starting by the selected node.
     */
    createRootFromNode(): void {
      if (Instance.getEngine(this.id)) {
        let n: FolderNode = Instance.getEngine(this.id)
          .selection[0] as FolderNode;
        this.addFolders([n.getPath()], { x: n.x, y: n.y });
      }
    },
    /**
     * Adds the given Trees to the Overview.
     */
    addTrees(entries: AbstractNodeTree[], pos: { x: number; y: number }) {
      let listEntries: AbstractNodeTree[] = Instance.getData(this.id);

      entries.forEach((e) => {
        e.setCoordinates(pos);
        e.engine = Instance.getEngine(this.id);
      });

      listEntries.push(...entries);

      /**
       * register the entries to the engine.
       */
      if (Instance.getEngine(this.id)) {
        Instance.getEngine(this.id).trees = [...listEntries];
      }

      /**
       * start syncing the folders in the entry.
       */
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (e instanceof FolderNodeTree) e.startWatcher();
      }
    },
    /**
     * Creates FolderNodeTree for the given list of Folder paths at the given
     * position.
     * @param listFolders The list of paths (to folders), to create FolderNodeTree for them.
     * @param position The position in the overview space where the tree will be added.
     */
    addFolders(listFolders: string[], position: { x: number; y: number }) {
      let listEntries: FolderNodeTree[] = [];

      /**
       * create the entries based on the dropped files.
       */
      for (let index = 0; index < listFolders.length; index++) {
        const f = listFolders[index];
        const p = path.normalize(f).replace(/\\/g, "/");
        const fileStat = fs.lstatSync(p);
        if (fileStat.isDirectory()) {
          let root: FolderNodeTree = new FolderNodeTree(p);
          let id = 0;
          while (listEntries.find((e) => e.id == id)) id++;
          root.id = id;
          listEntries.push(root);
        }
      }
      if (listEntries.length > 0) {
        this.addTrees(listEntries, position);
      }
    },
    /**
     * A drop event from the Operating System.
     */
    drop(e: DragEvent) {
      let listFolders: string[] = [];

      /**
       * create Tree based on the dropped folders.
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
