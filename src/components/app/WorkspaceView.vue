<template>
  <div @keydown="keydownGlobal" class="wrapper">
    <div class="workspace-search" v-show="getShowUI">
      <div class="prevent-input"></div>
      <input
        class="workspace-search-input"
        type="search"
        placeholder="Suche..."
        v-model="searchString"
        @keydown.delete="searchString = ''"
        @keydown.stop
        @keyup.stop
        @focus="searchfocusSet(true)"
        @blur="searchfocusSet(false)"
      />
      <div class="prevent-input"></div>
      <div class="search-results" v-show="searchActive">
        <wssearchlist
          :model="model"
          :searchString="searchString"
          @bookmarkclicked="moveToEntry"
        ></wssearchlist>
      </div>
    </div>

    <splitpanes
      @ready="modifyPanes($event)"
      :dbl-click-splitter="false"
      @resize="model.paneSize = $event[0].size"
      class="default-theme splitpane"
    >
      <pane :size="model.paneSize">
        <div
          @mousedown="mousedown"
          @mousemove="mousemove"
          @mouseup="mouseup"
          @mouseenter="setFocusToWorkspace()"
          @keydown="keydown"
          @keyup="keyup"
          @wheel="wheel"
          @click.stop
          @dragover="dragover"
          @dragleave="dragleave"
          @drop="drop"
          class="workspace-split-wrapper"
        >
          <div
            v-if="overviewfolder != undefined"
            class="workspace-folder-dialog"
          >
            <wsentryfolder
              :name="98345930245"
              :key="98345930245"
              :entry="overviewfolder"
              :viewId="98345930245"
              :workspace="this"
              :searchstring="searchString"
              style="width: 100%; height: 100%"
            ></wsentryfolder>
          </div>
          <canvas class="workspace-canvas"></canvas>

          <panZoom
            @init="panHappen"
            @pan="onPanStart"
            @zoom="onZoom"
            tabIndex="0"
            :options="{
              zoomDoubleClickSpeed: 1,
              minZoom: 0.01,
              maxZoom: 20,
              bounds: false,
              transformOrigin: null,
              initialX: model.viewportTransform.x,
              initialY: model.viewportTransform.y,
              initialZoom: model.viewportTransform.scale,
              beforeWheel: beforeWheelHandler,
              beforeMouseDown: beforeMouseDownHandler,
            }"
            selector=".zoomable"
          >
            <div
              class="zoomable close-file-anim"
              @paste="paste"
              @input.stop.prevent
            >
              <div class="rectangle-selection"></div>
              <div class="rectangle-selection-wrapper">
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
              </div>

              <keep-alive>
                <component
                  class="ws-entry"
                  v-for="e in model.entries"
                  :name="e.id"
                  :key="e.id"
                  :entry="e"
                  :viewKey="e.id"
                  :workspace="workspaceInterface"
                  @keydown="keydown"
                  @zoomed="moveToEntry({ id: e.id, zoom: true })"
                  :searchstring="searchString"
                  :is="e.componentname"
                  ref="wsentry"
                >
                  <wsentrydisplayname :entry="e" />
                </component>
              </keep-alive>

              <div
                :class="{ 'blend-out': model.entries.length > 0 }"
                class="welcome-message"
              >
                <h2>
                  Let's drop some files to get going!
                  <EmoticonHappyOutline class="svg-smile" />
                </h2>
                <p>
                  <FileOutline class="svg-file" />
                  <FolderOutline class="svg-folder" />
                </p>
                <p><Download class="svg-download" /></p>
              </div>
            </div>
          </panZoom>

          <wsentriesbookmarks
            :model="model"
            :workspace="getWorkspaceIfc()"
            @bookmarkclicked="moveToEntry"
          ></wsentriesbookmarks>

          <button
            class="pane-button-ws"
            :class="{ 'workspace-menu-bar-hide': !getShowUI }"
          >
            <FormatHorizontalAlignCenter
              v-show="model.paneSize >= 85"
              @click="paneButtonClicked()"
            />
            <ArrowCollapseLeft
              v-show="model.paneSize < 85"
              @click="paneButtonClicked()"
            />
          </button>

          <div
            @mousedown.stop
            class="workspace-menu-bar"
            :class="{ 'workspace-menu-bar-hide': !getShowUI }"
          >
            <tippy-singleton
              :moveTransition="'transform 0.2s ease-out'"
              :offset="[0, 40]"
            >
              <tippy :offset="[0, 40]">
                <button><Overscan @click="showAll()" /></button>
                <template #content
                  >Show All <kbd>Ctrl</kbd>|<kbd>Space</kbd></template
                >
              </tippy>
              <tippy :offset="[0, 40]">
                <button><FileOutline @click="createEntry('files')" /></button>
                <template #content>Add Files <kbd>X</kbd></template>
              </tippy>
              <tippy :offset="[0, 40]">
                <button>
                  <FolderOutline @click="createEntry('folders')" />
                </button>
                <template #content>Add Folders <kbd>C</kbd></template>
              </tippy>
              <tippy :offset="[0, 40]">
                <button><Group @click="createEntry('frame')" /></button>
                <template #content>Add Frame <kbd>F</kbd></template>
              </tippy>
              <tippy :offset="[0, 40]">
                <button><youtube @click="createEntry('youtube')" /></button>
                <template #content>Add Youtube Video <kbd>Y</kbd></template>
              </tippy>
              <tippy :offset="[0, 40]">
                <button>
                  <CommentTextOutline @click="createEntry('text')" />
                </button>
                <template #content>Create Text-Editor <kbd>T</kbd></template>
              </tippy>
              <tippy :offset="[0, 40]">
                <button
                  @click="setFocusOnNameInput(undefined)"
                  :disabled="selectedEntriesCount != 1"
                >
                  <FormTextbox />
                </button>
                <template #content
                  >Edit Name <kbd>Ctrl</kbd>+<kbd>E</kbd></template
                >
              </tippy>
              <tippy :offset="[0, 40]">
                <button :disabled="selectedEntriesCount == 0">
                  <DeleteEmptyOutline @click="deleteSelection" />
                </button>
                <template #content>Delete <kbd>Del</kbd></template>
              </tippy>
            </tippy-singleton>
            <!-- <button
        style="transform: rotate(90deg)"
        :disabled="selectedEntriesCount == 0"
      >
        <arrow-expand />
      </button> -->

            <!-- <button :disabled="selectedEntriesCount < 2"><BorderAll /></button> -->

            <!-- <button
              @click="toggleNameResizing()"
              :disabled="selectedEntriesCount != 1"
            >
              <FormatSize />
            </button> -->
          </div>
        </div>
      </pane>

      <pane :size="100 - model.paneSize">
        <OverviewView
          @folderSelected="updateOverviewFolderSelection"
          class="overview"
          :model="model"
          :searchstring="searchString"
        />
      </pane>
    </splitpanes>
  </div>
</template>

<script lang="ts">
import { Tippy, TippySingleton } from "vue-tippy";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import { ipcRenderer } from "electron";
import {
  WorkspaceEntryFile,
  WorkspaceEntryFolderWindow,
  WorkspaceEntryFrame,
  WorkspaceEntryImage,
  WorkspaceEntryTextArea,
  WorkspaceEntryVideo,
  WorkspaceEntryYoutube,
} from "@/store/model/implementations/filesystem/FileSystemWorkspaceEntries";
import { MutationTypes } from "@/store/mutations/mutation-types";
import * as WSUtils from "./WorkspaceUtils";
import OverviewView from "./OverviewView.vue";
import wsentriesbookmarks from "./WorkspaceEntriesBookmarks.vue";
import wssearchlist from "./WorkspaceSeachList.vue";
import wsentryfolder from "../implementations/WorkspaceEntryFolderView.vue";
import { defineComponent } from "vue";
import {
  ElementDimension,
  ElementDimensionInstance,
  getCoordinatesFromElement,
  ResizerComplex,
  set3DPosition,
} from "@/utils/resize";
import { deserialize, serialize } from "class-transformer";
import _ from "underscore";
import WorkspaceViewIfc from "./WorkspaceViewIfc";
import WorkspaceViewIfcWrapper from "./WorkspaceViewIfcWrapper";
const fs = require("fs");
let clipboard: WorkspaceEntryCollection;
import {
  FormTextbox,
  Resize,
  CommentTextOutline,
  Overscan,
  Youtube,
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
  FormatHorizontalAlignCenter,
  ArrowCollapseLeft,
  DeleteVariant,
} from "mdue";
import { Workspace } from "@/store/model/app/Workspace";
import ReArrange from "./../Plugins/Rearrange";
import AbstractPlugin from "./plugins/AbstractPlugin";
import wsentrydisplayname from "./WorkspaceEntryDisplayName.vue";
import WorkspaceEntryCollection from "@/store/model/app/WorkspaceEntryCollection";
import WorkspaceEntry from "@/store/model/app/WorkspaceEntry";
import { getPlugins } from "@/components/Plugins/PluginList";
import { createKeyboardInputContext } from "@/components/app/plugins/KeyboardShortcut";

getPlugins();

export default defineComponent({
  el: ".wrapper",
  name: "WorkspaceView",
  components: {
    wsentryfolder,
    Tippy,
    TippySingleton,
    Pane,
    Splitpanes,
    DeleteVariant,
    FormatHorizontalAlignCenter,
    ArrowCollapseLeft,
    EmoticonHappyOutline,
    Download,
    FolderOutline,
    FileOutline,
    FormatSize,
    ResizeBottomRight,
    BorderAll,
    Group,
    FormTextbox,
    ArrowExpand,
    CommentTextOutline,
    Youtube,
    Table,
    DeleteEmptyOutline,
    Overscan,
    Resize,
    wsentrydisplayname,
    wsentriesbookmarks,
    wssearchlist,
    OverviewView,
  },
  props: {
    model: {
      type: Workspace,
      required: true,
    },
  },
  data(): {
    activePlugin: AbstractPlugin | null;
    searchString: string;
    dragStart: { x: number; y: number };
    dragMoveRel: { x: number; y: number };
    dragTempOffset: { x: number; y: number };
    selectionDragActive: boolean;
    searchfocus: boolean;
    isSelectionEvent: boolean;
    panZoomInstance: any;
    mousePositionLastRaw: { x: number; y: number };
    mousePositionLast: { x: number; y: number };
    dragSelection: HTMLElement[];
    selectionWrapperResizer: ResizerComplex | null;
    useCanvas: boolean;
    oldViewRect: ElementDimension | undefined;
    spacePressed: boolean;
    highlightSelection: boolean;
    divObserver: any;
    selectedEntriesCount: number;
    splitpaneTimeout: any | undefined;
    ignoreFileDrop: boolean;
    overviewfolder: WorkspaceEntryFolderWindow | undefined;
    workspaceInterface: WorkspaceViewIfcWrapper;
    skipInitialResize: number;
    eventOnMouseup:
      | { entries: HTMLElement[]; type: "add" | "single" | "flip" }
      | undefined;
    c: any;
  } {
    return {
      /**
       * ignores a file drop once when true, then it is set to false.
       */
      c: undefined,
      eventOnMouseup: undefined,
      workspaceInterface: new WorkspaceViewIfcWrapper(),
      overviewfolder: undefined,
      ignoreFileDrop: false,
      splitpaneTimeout: undefined,
      highlightSelection: true,
      activePlugin: null,
      skipInitialResize: 0,
      searchString: "",
      useCanvas: true,
      mousePositionLastRaw: { x: 0, y: 0 },
      mousePositionLast: { x: 0, y: 0 },
      dragMoveRel: { x: 0, y: 0 },
      dragStart: { x: 0, y: 0 },
      dragTempOffset: { x: 0, y: 0 },
      searchfocus: false,
      selectionDragActive: false,
      isSelectionEvent: false,
      panZoomInstance: null,
      dragSelection: [],
      selectionWrapperResizer: null,
      oldViewRect: undefined,
      spacePressed: false,
      divObserver: null,
      selectedEntriesCount: 0,
    };
  },
  watch: {
    "model.isActive": function (newValue: boolean, oldValue: boolean) {
      if (newValue) {
        this.setFocusToWorkspace();
      }
    },
    searchString: function (newValue: string, oldValue: string) {
      this.searchUpdate();
    },
    highlightSelection(newValue: boolean, oldValue: boolean) {
      this.updateSelectionWrapper();
    },
    getShowUI(newValue: boolean, oldValue: boolean) {
      const bar: HTMLElement = this.$el.getElementsByClassName(
        "splitpanes__splitter"
      )[0];

      bar.classList.toggle("splitpanes__splitter-hide", !newValue);
    },
  },
  mounted() {
    let _this = this;

    this.c = createKeyboardInputContext({
      debounceTime: 100,
      autoEnable: true,
    });

    /**
     * Somehow making it contenteditable in the beginning causes the paste litener to
     * work when we then toggle the contenteditable in the keydown listener at an ctrl+v input
     */
    (function () {
      const panzoomscene =
        _this.$el.getElementsByClassName("vue-pan-zoom-scene")[0];
      panzoomscene.addEventListener("paste", (e: ClipboardEvent) =>
        _this.paste(e)
      );
      panzoomscene.setAttribute("contenteditable", true);
      setTimeout(() => {
        panzoomscene.setAttribute("contenteditable", false);
      }, 100);
    })();

    getPlugins().forEach((p) => {
      const panel = new p();
      this.c.register(panel.shortcut, () => {
        alert(panel.shortcut);
      });
    });

    _this.workspaceInterface.ws = _this.getWorkspaceIfc();

    /**
     * Listen for resizing of the canvas parent element
     */
    this.divObserver = new ResizeObserver(
      _.throttle((entries: ResizeObserverEntry[]) => {
        for (let index = 0; index < entries.length && index < 1; index++) {
          const e = entries[index];
          e.target; // div element
          let w = Math.max(10, e.contentRect.width);
          let h = Math.max(10, e.contentRect.height);

          if (this.skipInitialResize++ > 0) {
            let diffX = _this.getCanvas().width - w,
              diffY = _this.getCanvas().height - h;

            this.panZoomInstance.moveTo(
              this.getCurrentTransform().x - diffX / 2,
              this.getCurrentTransform().y - diffY / 2
            );
          }
          _this.getCanvas().width = w;
          _this.getCanvas().height = h;
          _this.drawCanvas();
        }
      }, 5)
    ).observe(this.$el.getElementsByClassName("workspace-split-wrapper")[0]);

    this.selectionWrapperResizer = new ResizerComplex(
      this.getSelectionWrapper(),
      this.getSelectionWrapper().firstChild as HTMLElement,
      this,
      () => {
        this.preventInput(true);
      },
      () => {
        this.drawCanvas();
      },
      () => {
        this.preventInput(false);
      }
    );

    ipcRenderer.on(
      "files-selected",
      function (
        event: any,
        data: { target: string; files: string[]; directory: string }
      ) {
        if (_this.model.isActive && data.target == "w" + _this.model.id) {
          _this.addEntriesToWorkspace(data.files, [], "center", true);
          _this.model.folderSelectionPath = data.directory;
        }
      }
    );

    _this.getCanvas().width = this.getWorkspaceWrapper().clientWidth;
    _this.getCanvas().height = this.getWorkspaceWrapper().clientHeight;

    this.drawCanvas();

    set3DPosition(
      this.$el.getElementsByClassName("welcome-message")[0],
      -750,
      -500
    );

    this.updateFixedZoomElements();

    this.setFocusToWorkspace();
    this.paneButtonClicked(this.model.paneSize, false);

    // this.panZoomInstance.zoomTo(
    //   this.model.viewportTransform.x,
    //   this.model.viewportTransform.y,
    //   this.model.viewportTransform.scale
    // );

    if (this.model.entries.length == 0) {
      this.panZoomInstance.moveTo(
        window.innerWidth / 2,
        window.innerHeight / 2
      );
    }

    WSUtils.Events.registerCallback({
      pluginStarted(modal: boolean): void {
        let instances = _this.$el.querySelectorAll(
          ".workspace-menu-bar, .bookmarks, .overview-viewport"
        );

        for (let i = 0; i < instances.length; i++) {
          const element = instances[i];
          element.classList.toggle("prevent-input", modal);
        }

        instances = _this.$el.querySelectorAll(
          ".workspace-menu-bar, .bookmarks"
        );

        for (let i = 0; i < instances.length; i++) {
          const element = instances[i];
          element.classList.toggle("search-not-found", modal);
        }
      },
      event(type: "fixedZoomUpdate"): void {
        if (_this.model.isActive) {
          setTimeout(() => {
            _this.updateFixedZoomElements();
          }, 10);
        }
      },
    });
  },
  unmounted() {
    if (this.divObserver) {
      this.divObserver.disconnect();
    }
  },
  computed: {
    getShowUI(): boolean {
      return this.$store.getters.getShowUI;
    },
    searchActive(): boolean {
      return this.searchString.trim().length > 0 && this.searchfocus;
    },
  },
  provide() {
    return {
      entrySelected: this.entrySelected,
      setFocusToWorkspace: this.setFocusToWorkspace,
      mouseupWorkspace: this.mouseup,
    };
  },
  inject: ["loadInsightFileFromPath", "loadInsightFileFromPath"],
  methods: {
    dispatchEvent(e: Event) {
      const d: HTMLElement =
        this.$el.getElementsByClassName("vue-pan-zoom-scene")[0];

      d.dispatchEvent(new WheelEvent(e.type, e));
    },
    updateOverviewFolderSelection(path: string | undefined): void {
      if (path) {
        const f = new WorkspaceEntryFolderWindow(path);
        f.isResizable = false;
        this.overviewfolder = f;
      } else {
        this.overviewfolder = undefined;
      }
    },
    modifyPanes(e: any): void {
      for (
        let i = 0;
        i < this.$el.getElementsByClassName("splitpanes__splitter").length;
        i++
      ) {
        const s: HTMLElement = this.$el.getElementsByClassName(
          "splitpanes__splitter"
        )[i];

        ["mousedown", "mousemove"].forEach((evt: any) => {
          s.addEventListener(
            evt,
            (e: MouseEvent) => {
              e.stopPropagation();
            },
            false
          );
        });
      }
    },
    /**
     * When a workspace gets active, the focus is not on its div, which prevents the keylisteners from working. Prevent this by calling this method when the workspace gets active.
     */
    setFocusToWorkspace(): void {
      if (WSUtils.doChangeFocus()) {
        setTimeout(() => {
          this.$el.getElementsByClassName("vue-pan-zoom-scene")[0].focus();
        }, 2);
      }
    },
    searchfocusSet(f: boolean): void {
      if (f) {
        this.searchfocus = true;
      } else {
        setTimeout(() => {
          this.searchfocus = false;
        }, 400);
      }
    },
    paneButtonClicked(
      size: number | undefined = undefined,
      transition: boolean = true
    ) {
      var list = document.querySelectorAll(".splitpanes, .splitpanes__pane");
      transition
        ? list.forEach((e) => e.classList.add("splitpanes__pane_transition"))
        : list.forEach((e) =>
            e.classList.remove("splitpanes__pane_transition")
          );

      setTimeout(() => {
        this.model.paneSize =
          size != undefined ? size : this.model.paneSize >= 85 ? 50 : 0;
      }, 5);

      if (transition) {
        clearTimeout(this.splitpaneTimeout);
        this.splitpaneTimeout = setTimeout(() => {
          list.forEach((e) =>
            e.classList.remove("splitpanes__pane_transition")
          );
        }, 620);
      }
    },
    searchUpdate(): void {
      let models = this.model.entries;
      let views = this.getEntries();

      if (this.searchString.trim().length > 0) {
        for (let index = 0; index < models.length; index++) {
          const m = models[index];
          const v = views[index];

          let f: boolean = m.searchLogic(
            this.searchString.trim().toLowerCase()
          );

          v.classList.toggle("search-not-found", !f);
        }
      } else {
        for (let index = 0; index < models.length; index++) {
          const v = views[index];
          v.classList.toggle("search-not-found", false);
        }
      }
    },
    getWorkspaceIfc(): WorkspaceViewIfc {
      return this;
    },
    drawCanvas() {
      if (this.model.overviewOpen) {
        //   return;
      }

      let canvas: HTMLCanvasElement = this.getCanvas() as HTMLCanvasElement;

      let context = canvas.getContext("2d");

      if (context == null) {
        return;
      }

      let b = Math.min(
        Math.max(15, 50 * (this.getCurrentTransform().scale * 10)),
        90
      );
      b = 30;
      context.fillStyle = "rgb(" + b + "," + b + "," + b + ")";

      context.clearRect(0, 0, canvas.width, canvas.height);
      //  context.fillRect(0, 0, canvas.width, canvas.height);

      b = 200;
      let currentC = this.getCurrentTransform();

      if (this.useCanvas) {
        context.save();

        context.translate(
          this.getCurrentTransform().x,
          this.getCurrentTransform().y
        );
        context.scale(
          this.getCurrentTransform().scale,
          this.getCurrentTransform().scale
        );

        context.restore();

        context.strokeStyle = "rgb(57, 215, 255)";
        context.lineWidth = 2;

        for (let e of this.getSelectedEntries()) {
          let c = this.getCoordinatesFromElement(e);

          c.x = c.x * currentC.scale + currentC.x;
          c.x2 = c.x2 * currentC.scale + currentC.x;

          c.y = c.y * currentC.scale + currentC.y;
          c.y2 = c.y2 * currentC.scale + currentC.y;

          c.w = c.w * currentC.scale;
          c.h = c.h * currentC.scale;

          let padding = 1;
          if (this.highlightSelection) {
            context.strokeRect(
              c.x - padding,
              c.y - padding,
              c.w + padding * 2,
              c.h + padding * 2
            );
          }
        }

        // let v = this.getEntries();
        // let m = this.getModelEntriesFromView(this.getEntries());

        // for (let index = 0; index < v.length; index++) {
        //   const view = v[index];
        //   const model = m[index];
        //   if (model instanceof WorkspaceEntryImage) {
        //     let c = this.getCoordinatesFromElement(view);

        //     c.x = c.x * currentC.scale + currentC.x;
        //     c.x2 = c.x2 * currentC.scale + currentC.x;

        //     c.y = c.y * currentC.scale + currentC.y;
        //     c.y2 = c.y2 * currentC.scale + currentC.y;

        //     c.w = c.w * currentC.scale;
        //     c.h = c.h * currentC.scale;

        //     ImageCache.registerPath(model.getURL(), {
        //       callback: (
        //         url: string,
        //         type: "small" | "medium" | "original"
        //       ) => {},
        //       callbackSize: (dim: ImageDim) => {},
        //     });
        //     let url = ImageCache.getUrlRaw(model.getURL(), "small");

        //     if (url && context) {
        //       let image = new Image();
        //       image.onload = function () {
        //         if (context) {
        //           context.drawImage(image, c.x, c.y, c.w, c.h);
        //           console.log("draw image");
        //         }

        //         image.src = url ? url : "";
        //       };
        //     }
        //   }
        // }
      }

      // b = 150;
      // context.fillStyle = "rgb(" + b + "," + b + "," + b + ")";

      // for (let p of points) {
      //   context.fillRect(
      //     (p.x + currentC.x * p.z) ,
      //     (p.y + currentC.y * p.z) ,
      //     6 * p.z,
      //     6 * p.z
      //   );
      // }
    },
    createEntry<T extends WorkspaceEntry>(
      type: "files" | "folders" | "frame" | "text" | "youtube" | "image",
      useMousePosition: boolean = false,
      path: string = ""
    ): T | undefined {
      let doPositioning = true;
      let viewport = this.getViewport();
      let listFiles: Array<WorkspaceEntry> = [];
      let payload = {
        model: <Workspace>this.model,
        listFiles,
      };
      let position: "center" | "mouse" | "none" = useMousePosition
        ? "mouse"
        : "center";
      switch (type) {
        case "files":
        case "folders":
          ipcRenderer.send("select-files", {
            type: type,
            target: "w" + this.model.id,
            path: this.model.folderSelectionPath,
          });
          break;
        case "image":
          listFiles.push(new WorkspaceEntryImage(path, true));
          break;
        case "youtube":
          listFiles.push(new WorkspaceEntryYoutube(path));
          break;
        case "text":
          listFiles.push(new WorkspaceEntryTextArea());
          break;
        case "frame":
          let frame = new WorkspaceEntryFrame();
          listFiles.push(frame);

          if (this.getSelectedEntries().length > 0) {
            const dimension = this.getBoundsForEntries(
              this.getSelectedEntries()
            );

            let padding = 80;
            frame.x = dimension.x - padding;
            frame.y = dimension.y - padding;
            frame.width = dimension.w + padding * 2;
            frame.height = dimension.h + padding * 2;
            doPositioning = false;
            position = "none";
          }
          break;
        default:
          break;
      }

      if (!listFiles) return undefined;

      if (doPositioning) {
        listFiles.forEach((f) => {
          if (useMousePosition) {
            f.x = this.mousePositionLast.x;
            f.y = this.mousePositionLast.y;
          } else {
            f.x = viewport.x + viewport.w / 2 - f.width / 2;
            f.y = viewport.y + viewport.h / 2 - f.height / 2;
            f.x -= f.width / 2;
            f.y -= f.height / 2;
          }
        });
      }

      this.addEntriesToWorkspace([], listFiles, position, true);

      return listFiles[0] as T;
    },
    getBoundsForEntries(
      listEntries: Array<WorkspaceEntry | HTMLElement>
    ): ElementDimension {
      let x = Infinity,
        y = Infinity,
        x2 = -Infinity,
        y2 = -Infinity;

      listEntries.forEach((e) => {
        if (e instanceof WorkspaceEntry) {
          x = x > e.x ? e.x : x;
          y = y > e.y ? e.y : y;
          x2 = x2 < e.x + e.width ? e.x + e.width : x2;
          y2 = y2 < e.y + e.height ? e.y + e.height : y2;
        } else if (e instanceof HTMLElement) {
          const c = this.getCoordinatesFromElement(e);
          x = x > c.x ? c.x : x;
          y = y > c.y ? c.y : y;
          x2 = x2 < c.x2 ? c.x2 : x2;
          y2 = y2 < c.y2 ? c.y2 : y2;
        }
      });
      return {
        x: x,
        y: y,
        x2: x2,
        y2: y2,
        w: Math.abs(x2 - x),
        h: Math.abs(y2 - y),
      };
    },
    startSelectionDrag(mousePosition: { x: number; y: number }) {
      /**
       * Start dragging of the current selection with left mouse button + ctrl or
       */
      this.dragSelection = Array.from(
        this.getSelectedEntries()
      ) as HTMLElement[];

      WSUtils.Events.dragStarting(this.dragSelection, this);

      this.dragSelection.push(this.getSelectionWrapper());

      this.dragMoveRel = mousePosition;
      this.selectionDragActive = true;
    },
    paste(e: ClipboardEvent) {
      e.preventDefault();
      let text = e.clipboardData?.getData("text");

      if (e.clipboardData?.items) {
        for (let index = 0; index < e.clipboardData?.items.length; index++) {
          const item = e.clipboardData?.items[index];

          if (item.type.includes("image")) {
            var blob = item.getAsFile();
            const smallURl = URL.createObjectURL(blob);
            let imageEntry = this.createEntry<WorkspaceEntryImage>(
              "image",
              true,
              smallURl
            );
            if (blob && imageEntry) {
              var reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = function () {
                var base64data = reader.result;
                if (imageEntry) imageEntry.blob = base64data as string;
              };
            }

            return;
          }
        }
      }

      if (
        text != undefined &&
        (text.includes("youtube.com") || text.includes("youtu.be"))
      ) {
        this.createEntry<WorkspaceEntryImage>("youtube", true, text);
      }
    },
    preventEvent(e: any, forward: boolean = true): boolean {
      var functionName: string = e.type as string;

      if (this.model.isActive && this.activePlugin) {
        return (
          !forward ||
          // @ts-ignore: Unreachable code error
          (this.activePlugin[functionName] &&
            // @ts-ignore: Unreachable code error
            (this.activePlugin[functionName](e) as boolean))
        );
      }
      return false;
    },

    keydownGlobal(e: KeyboardEvent) {
      if (this.preventEvent(e, false)) return;

      /**
       * No ... key down
       */
      if (!e.altKey && !e.ctrlKey) {
        switch (e.key) {
          case "e":
            this.paneButtonClicked(100);
            e.stopPropagation();
            break;
          case "w":
            this.paneButtonClicked(50);
            e.stopPropagation();
            break;
          case "q":
            this.paneButtonClicked(0);
            e.stopPropagation();
            break;
        }
      }
    },
    keydown(e: KeyboardEvent) {
      if (
        e.key == "Escape" &&
        this.activePlugin &&
        this.activePlugin.cancel()
      ) {
        this.cancelPlugin();
      }

      if (this.preventEvent(e)) return;

      /**
       * Control key down
       */
      if (e.ctrlKey && !e.repeat) {
        switch (e.key) {
          case " ":
            if (e.repeat) {
              return;
            }
            this.showAll();
            break;
          case "a":
            this.selectAll();
            break;
          case "d":
            this.clearSelection();
            break;
          case "x":
            if (this.getSelectedEntries().length > 0) {
              WSUtils.Events.prepareFileSaving();

              clipboard = new WorkspaceEntryCollection();
              clipboard.entries.push(
                ...this.getModelEntriesFromView(this.getSelectedEntries())
              );
              this.deleteSelection();
            }
            break;
          case "c":
            if (this.getSelectedEntries().length > 0) {
              WSUtils.Events.prepareFileSaving();

              clipboard = new WorkspaceEntryCollection();
              clipboard.entries.push(
                ...this.getModelEntriesFromView(this.getSelectedEntries())
              );
            }
            break;
          case "f":
            const search = this.$el.getElementsByClassName(
              "workspace-search-input"
            )[0];
            if (search) {
              search.focus();
            }
            break;
          case "v":
            this.$el.getElementsByClassName(
              "vue-pan-zoom-scene"
            )[0].style.cursor = "hand";
            this.$el
              .getElementsByClassName("vue-pan-zoom-scene")[0]
              .setAttribute("contenteditable", true);

            // contenteditable on the focused div makes sure we can register a paste event by the user throug ctrl+v
            setTimeout(() => {
              this.$el.getElementsByClassName(
                "vue-pan-zoom-scene"
              )[0].style.cursor = "hand";
              this.$el
                .getElementsByClassName("vue-pan-zoom-scene")[0]
                .setAttribute("contenteditable", false);
            }, 250);

            if (clipboard && clipboard.entries.length > 0) {
              let jsonString = serialize(clipboard);

              let pastedEntries: WorkspaceEntryCollection = deserialize(
                WorkspaceEntryCollection,
                jsonString
              );

              let xMin = 10000000;
              let yMin = 10000000;

              for (let entry of pastedEntries.entries) {
                xMin = xMin > entry.x ? entry.x : xMin;
                yMin = yMin > entry.y ? entry.y : yMin;
              }

              for (let entry of pastedEntries.entries) {
                entry.x += -xMin + this.mousePositionLast.x;
                entry.y += -yMin + this.mousePositionLast.y;
              }

              this.addEntriesToWorkspace([], pastedEntries.entries, "none");

              e.preventDefault();
              e.stopPropagation();
            }
        }

        return;
      }

      /**
       * Alt key down
       */
      if (e.altKey && !e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case "r":
            this.setFocusOnNameInput();
            break;
        }
      }

      const number = e.code.replace("Digit", "");
      const goToBookmark = (number: number, zoom: boolean) => {
        /**
         * Shortcut for bookmark selection
         */
        var bookmarks: Array<HTMLElement> = Array.from(
          this.$el.getElementsByClassName("bookmark-entry")
        );
        bookmarks = bookmarks.filter((b) => b.style.display != "none");

        let i: number = +number - 1;
        if (i < bookmarks.length) {
          this.moveToEntry({
            id: bookmarks[i].getAttribute("name"),
            zoom: zoom,
          });
        }
        e.preventDefault();
        e.stopPropagation();
      };

      /**
       * Shift key down
       */
      if (e.shiftKey && !e.ctrlKey && !e.altKey) {
        switch (e.key) {
          case " ":
            this.showSelection();
            break;
        }
        switch (number) {
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            goToBookmark(+number, true);
            return;
        }
      }

      /**
       * No modifier key down
       */
      if (!e.altKey && !e.shiftKey && !e.ctrlKey) {
        switch (e.key) {
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            goToBookmark(+number, false);
            return;
          case " ":
            if (e.repeat) {
              return;
            }
            this.preventInput(true);
            this.spacePressed = true;
            this.showAll();
            break;
          case "r":
            if (this.getSelectedEntries().length > 1) {
              this.startPlugin(new ReArrange());
            }
            break;
          case "t":
            this.createEntry("text", true);
            break;
          case "f":
            this.createEntry("frame", true);
            break;
          case "y":
            this.createEntry("youtube", true);
            break;
          case "Delete":
          case "delete":
            this.deleteSelection();
            break;
        }
      }
    },
    keyup(e: KeyboardEvent) {
      if (this.preventEvent(e)) return;

      if (!e.altKey && !e.ctrlKey) {
        switch (e.key) {
          case " ":
            if (this.spacePressed) {
              if (this.oldViewRect) {
                let bound = this.getPanzoomRect(this.oldViewRect);
                this.panZoomInstance.smoothShowRectangle(bound);
                // this.panZoomInstance.showRectangle(bound);
              }
              this.preventInput(false);
              this.spacePressed = false;
            }
            break;
        }
      }

      this.drawCanvas();
    },
    mousedown: function (e: MouseEvent) {
      if (this.preventEvent(e)) return;

      if (this.spacePressed) {
        this.spacePressed = false;
        this.preventInput(false);
        let rect: DOMRect = this.getWorkspaceWrapper().getBoundingClientRect();
        let bound = this.getPanzoomRect({
          x: this.mousePositionLast.x - rect.width / 2,
          y: this.mousePositionLast.y - rect.height / 2,
          x2: this.mousePositionLast.x + rect.width / 2,
          y2: this.mousePositionLast.y + rect.height / 2,
          w: rect.width,
          h: rect.height,
        });
        this.panZoomInstance.smoothShowRectangle(bound);

        return;
      }

      if ((e.button == 0 && e.ctrlKey) || e.button == 2) {
        this.startSelectionDrag({ x: e.clientX, y: e.clientY });
        return;
      }

      if (e.altKey) {
        this.startFileDrag();
        return;
      }

      if (e.button == 0) {
        if (!e.ctrlKey) {
          this.dragStart = this.getPositionInWorkspace(e);

          let selectionRectangle: any = this.getSelectionRectangle();
          selectionRectangle.style.visibility = "visible";
          selectionRectangle.style.transform = `translate3d(${this.dragStart.x}px, ${this.dragStart.y}px,0px)`;
          selectionRectangle.style.width = "0px";
          selectionRectangle.style.height = "0px";
        }

        if (this.selectionDragActive) {
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
      }
    },
    mousemoveThrottle: _.throttle((e: MouseEvent, _this: any) => {
      _this.mousePositionLastRaw = { x: e.clientX, y: e.clientY };
      _this.mousePositionLast = _this.getPositionInWorkspace(e);

      let selectionRectangle: any = _this.getSelectionRectangle();

      function updateSelectionRectangle() {
        let w = -1 * (_this.dragStart.x - _this.getPositionInWorkspace(e).x);
        let h = -1 * (_this.dragStart.y - _this.getPositionInWorkspace(e).y);

        let rectX = w < 0 ? _this.dragStart.x + w : _this.dragStart.x;
        let rectY = h < 0 ? _this.dragStart.y + h : _this.dragStart.y;

        selectionRectangle.style.transform = `translate3d(${rectX}px, ${rectY}px,0px)`;
        selectionRectangle.style.width = Math.abs(w) + "px";
        selectionRectangle.style.height = Math.abs(h) + "px";
      }

      if (_this.selectionDragActive) {
        _this.preventInput(true);
        _this.updateSelectionDrag(e, _this);
      } else {
        if (selectionRectangle.style.visibility === "visible") {
          _this.isSelectionEvent = true;
          updateSelectionRectangle();
        }
      }

      _this.drawCanvas();
    }, 10),
    mousemove: function (e: MouseEvent) {
      if (this.preventEvent(e)) return;
      this.mousemoveThrottle(e, this);
    },
    mouseup: function (e: MouseEvent) {
      if (this.preventEvent(e)) return;

      if (this.eventOnMouseup) {
        this.handleSelectionEvent(
          this.eventOnMouseup.entries,
          this.eventOnMouseup.type,
          false // do not start drag in this case
        );
        this.eventOnMouseup = undefined;
      }

      let selectionRectangle: any = this.getSelectionRectangle();

      if (this.selectionDragActive) {
        this.preventInput(false);

        /**
         * end dragging of the selected entries
         * */
      } else if (selectionRectangle.style.visibility === "visible") {
        /**
         * Selection rectangle, check which entries are inside it and make same as the selection.
         */

        let coordRect = this.getCoordinatesFromElement(selectionRectangle);
        let comp = this;

        let entriesInside: HTMLElement[] = [];

        entriesInside.push(
          ...this.getEntries().filter((el) => {
            return WSUtils.insideRect(
              coordRect,
              comp.getCoordinatesFromElement(el)
            );
          })
        );

        this.entriesSelected(entriesInside, "single", false);

        selectionRectangle.style.visibility = "hidden";
      }

      this.selectionDragActive = false;
    },
    wheel(e: WheelEvent) {
      if (this.preventEvent(e)) return true;
    },
    beforeWheelHandler(e: any) {
      if (this.model.isActive && this.activePlugin) return true;

      this.spacePressed = false;
      // this.getEntries().forEach((e) => { WHY is this needed?
      //   e.classList.toggle("prevent-input", false);
      // });
      var shouldIgnore: boolean = e.altKey;
      return shouldIgnore;
    },
    beforeMouseDownHandler(e: any) {
      if (this.model.isActive && this.activePlugin) return true;

      var shouldIgnore: boolean = !(/*e.altKey ||*/ (e.button == 1));

      return shouldIgnore;
    },
    dragover(e: DragEvent) {
      if (this.preventEvent(e)) return;

      /**
       * mousemove Events are not fired while dragging, so we update the position here.
       */
      this.mousePositionLastRaw = { x: e.clientX, y: e.clientY };
      this.mousePositionLast = this.getPositionInWorkspace(e);

      this.$el
        .getElementsByClassName("svg-download")[0]
        .classList.toggle("pulsating", true);

      e.preventDefault();
    },
    dragleave(e: any) {
      if (this.preventEvent(e)) return;

      this.$el
        .getElementsByClassName("svg-download")[0]
        .classList.toggle("pulsating", false);
    },
    drop(e: DragEvent) {
      if (this.preventEvent(e)) return;

      if (this.ignoreFileDrop) {
        this.ignoreFileDrop = false;
        return;
      }

      this.$el
        .getElementsByClassName("svg-download")[0]
        .classList.toggle("pulsating", false);
      e.preventDefault();

      if (e.dataTransfer) {
        if (e.dataTransfer.types.includes("text/plain")) {
          let t = new WorkspaceEntryTextArea();
          t.text = e.dataTransfer.getData("text");
          this.addEntriesToWorkspace([], [t], "mouse");
          return;
        } else if (e.dataTransfer.types.includes("Files")) {
          let listFiles: Array<string> = [];

          for (let index = 0; index < e.dataTransfer.files.length; index++) {
            const f = e.dataTransfer.files[index];
            listFiles.push(f.path);
          }
          this.addEntriesToWorkspace(listFiles, [], "mouse");
        }
      }
    },
    addEntriesToWorkspace(
      listFilePaths: string[],
      listFiles: WorkspaceEntry[] = [],
      position: "center" | "mouse" | "none",
      positionAsCenter: boolean = false
    ): void {
      for (let index = 0; index < listFilePaths.length; index++) {
        const f = listFilePaths[index];

        const fileStat = fs.lstatSync(f);
        const p = f.normalize().replace(/\\/g, "/");
        const lc = p.toLowerCase();

        if (fileStat.isDirectory()) {
          listFiles.push(new WorkspaceEntryFolderWindow(p));
        } else {
          if (
            lc.endsWith("jpg") ||
            lc.endsWith("jpeg") ||
            lc.endsWith("gif") ||
            lc.endsWith("png")
          ) {
            listFiles.push(new WorkspaceEntryImage(p));
          } else if (
            lc.endsWith("mp4") ||
            lc.endsWith("m4v") ||
            lc.endsWith("mkv") ||
            lc.endsWith("ogg") ||
            lc.endsWith("webm") ||
            lc.endsWith("wav")
          ) {
            listFiles.push(new WorkspaceEntryVideo(p));
          } else if (p.endsWith("ins")) {
            // @ts-ignore: Unreachable code error
            this.loadInsightFileFromPath(p);
            return;
          } else {
            listFiles.push(new WorkspaceEntryFile(p));
          }
        }
      }

      var x = 0,
        y = 0;

      switch (position) {
        case "mouse":
          x = this.mousePositionLast.x;
          y = this.mousePositionLast.y;
          break;
        case "center":
        default:
          x = this.getViewport().x + this.getViewport().w / 2;
          y = this.getViewport().y + this.getViewport().h / 2;
          break;
      }

      if (position != "none") {
        let tileCount = Math.ceil(Math.sqrt(listFiles.length)) - 1;
        var offsetWMax = 0;
        var offsetHMax = 0;
        var offsetH = 0;
        var offset = 0;
        let rowHeightMax = 0;
        for (
          let indexW = 0, indexH = 0;
          indexW < listFiles.length;
          indexW++, indexH++
        ) {
          const e = listFiles[indexW];

          e.x = x + offset;
          e.y = y + offsetH;

          offsetWMax =
            offsetWMax < offset + e.width ? offset + e.width : offsetWMax;
          offsetHMax =
            offsetHMax < offsetH + e.height ? offsetH + e.height : offsetHMax;

          offset += e.width + 20;

          rowHeightMax = rowHeightMax < e.height ? e.height : rowHeightMax;

          if (indexH > tileCount) {
            offsetH += rowHeightMax;
            offset = 0;
            indexH = 0;
          }
        }

        if (positionAsCenter) {
          const dimension = this.getBoundsForEntries(listFiles);

          for (let i = 0; i < listFiles.length; i++) {
            const e = listFiles[i];
            e.x -= dimension.w / 2;
            e.y -= dimension.h / 2;
          }
        }
      }

      this.$store.commit(MutationTypes.ADD_FILES, {
        model: <Workspace>this.model,
        listFiles,
      });

      setTimeout(() => {
        this.clearSelection();
        this.entriesSelected(this.getViewsByModels(listFiles), "add", false);
        this.updateFixedZoomElements();
      }, 33);
    },
    getBounds(entries: HTMLElement[] | HTMLElement): ElementDimension {
      let x = Infinity,
        y = Infinity,
        x2 = -Infinity,
        y2 = -Infinity;

      if (entries instanceof HTMLElement) {
        entries = [entries];
      }

      Array.from(entries).forEach((el) => {
        let coord = this.getCoordinatesFromElement(el);

        x = x > coord.x ? coord.x : x;
        y = y > coord.y ? coord.y : y;

        x2 = x2 < coord.x2 ? coord.x2 : x2;
        y2 = y2 < coord.y2 ? coord.y2 : y2;
      });

      return {
        x: x,
        y: y,
        w: x2 - x,
        h: y2 - y,
        x2: x2,
        y2: y2,
      };
    },
    getViewport(): ElementDimension {
      let currenTransform = this.getCurrentTransform();

      let rect: DOMRect = this.$el
        .getElementsByClassName("vue-pan-zoom-item")[0]
        .getBoundingClientRect();

      let oldView: ElementDimension = {
        x: -currenTransform.x / this.getCurrentTransform().scale,
        y: -currenTransform.y / this.getCurrentTransform().scale,
        w: rect.width * (1 / currenTransform.scale),
        h: rect.height * (1 / currenTransform.scale),
        x2: 0,
        y2: 0,
      };

      oldView.x2 = oldView.x + oldView.w;
      oldView.y2 = oldView.y + oldView.h;
      return oldView;
    },
    showSelection() {
      let bound = this.getPanzoomRect(
        this.getBounds(
          this.getSelectedEntries().length > 0
            ? this.getSelectedEntries()
            : this.getEntries().length > 0
            ? this.getEntries()
            : this.$el.getElementsByClassName("welcome-message")[0]
        ),
        0.6
      );
      this.panZoomInstance.smoothShowRectangle(bound);
    },

    showAll() {
      this.oldViewRect = this.getViewport();

      let bound = this.getPanzoomRect(
        this.getBounds(
          this.getEntries().length > 0
            ? this.getEntries()
            : this.$el.getElementsByClassName("welcome-message")[0]
        ),
        0.2
      );
      this.panZoomInstance.smoothShowRectangle(bound);
    },
    getPanzoomRect(
      coordinates: ElementDimension,
      scaler: number = 0
    ): {
      bottom: number;
      left: number;
      right: number;
      top: number;
    } {
      let rect: {
        bottom: number;
        left: number;
        right: number;
        top: number;
      } = {
        left: coordinates.x - scaler * coordinates.w,
        right: coordinates.x2 + scaler * coordinates.w,
        top: coordinates.y - scaler * coordinates.h,
        bottom: coordinates.y2 + scaler * coordinates.h,
      };

      return rect;
    },
    moveToEntry(
      payload:
        | { index: any; zoom: boolean }
        | { id: any; zoom: boolean }
        | { entry: HTMLElement; zoom: boolean }
    ) {
      let p: any = payload;

      let entry: HTMLElement | null = null;

      if (p.index != undefined) {
      } else if (p.entry != undefined) {
        entry = p.entry;
      } else if (p.id != undefined) {
        entry = this.getViewByID(Number(p.id));
      }

      if (entry != null) {
        this.moveToHTMLElement(entry, payload.zoom);
      }
    },
    moveToHTMLElement(
      entry: HTMLElement,
      zoom: boolean,
      smooth: boolean = true,
      padding: number | undefined = undefined
    ) {
      if (entry != null) {
        let coordinates = this.getCoordinatesFromElement(entry);

        coordinates.scaleFromCenter(
          padding
            ? padding
            : Math.max(1, 400 / Math.max(coordinates.w, coordinates.h))
        );

        let scaler = 1;

        let rect: {
          bottom: number;
          left: number;
          right: number;
          top: number;
        } = {
          left: coordinates.x - scaler * coordinates.w,
          right: coordinates.x2 + scaler * coordinates.w,
          top: coordinates.y - scaler * coordinates.h,
          bottom: coordinates.y2 + scaler * coordinates.h,
        };

        let x =
          (-coordinates.x - coordinates.w / 2) *
            this.getCurrentTransform().scale +
          this.getWorkspaceWrapper().clientWidth / 2;
        let y =
          (-coordinates.y - coordinates.w / 2) *
            this.getCurrentTransform().scale +
          this.getWorkspaceWrapper().clientHeight / 2;

        if (rect.bottom == rect.top || rect.left == rect.right) return;

        if (zoom) {
          if (smooth) {
            this.panZoomInstance.smoothShowRectangle(rect);
          } else {
            this.panZoomInstance.showRectangle(rect);
          }
        } else {
          if (smooth) {
            this.panZoomInstance.smoothMoveTo(x, y);
          } else {
            this.panZoomInstance.moveTo(x, y);
          }
        }
      }
    },
    entrySelected(entry: any, type: "add" | "single" | "flip") {
      this.entriesSelected([entry], type);
    },
    entriesSelected(
      entries: HTMLElement[],
      type: "add" | "single" | "flip",
      activateDrag: boolean = true
    ) {
      /**
       * Do not select entries that don't fit to the search
       */
      entries = entries.filter(
        (e) => !e.classList.contains("search-not-found")
      );

      if (
        (type == "flip" || type == "single") &&
        entries.length > 0 &&
        this.getSelectedEntries()
          .map((e) => e.getAttribute("name"))
          .includes(entries[0].getAttribute("name"))
      ) {
        this.eventOnMouseup = { entries: entries, type: type };
      }

      this.handleSelectionEvent(entries, type, activateDrag);
    },
    handleSelectionEvent(
      entries: HTMLElement[],
      type: "add" | "single" | "flip",
      activateDrag: boolean = true
    ) {
      if (!this.eventOnMouseup) {
        switch (type) {
          case "single":
            this.getEntries().forEach((e) =>
              e.classList.remove("workspace-is-selected")
            );
          case "add":
            entries.forEach((e) => e.classList.add("workspace-is-selected"));
            break;
          case "flip":
            // ctrl click on an entry
            entries.forEach((e) => e.classList.toggle("workspace-is-selected"));
            break;
        }

        /**
         * Mark a single selection with a css class
         */
        Array.from(document.getElementsByClassName("ws-entry")).forEach(
          (e: any) => {
            e.classList.remove("workspace-is-selected-single");
          }
        );
        Array.from(
          document.getElementsByClassName("ws-entry workspace-is-selected")
        ).forEach((e: any) => {
          e.classList.toggle(
            "workspace-is-selected-single",
            this.getSelectedEntries().length == 1
          );
        });

        /**
         *
         */
        if (this.getSelectedEntries().length > 1) {
          /**
           * when more then one entry is selected,
           */
          document
            .querySelectorAll("div.ws-entry .wsentry-displayname")
            .forEach((e) => {
              e.classList.toggle("prevent-input", true);
            });
        } else {
          document
            .querySelectorAll("div.ws-entry .wsentry-displayname")
            .forEach((e) => {
              e.classList.toggle("prevent-input", false);
            });
          document
            .querySelectorAll(
              "div.ws-entry:not(.workspace-is-selected) .wsentry-displayname"
            )
            .forEach((e) => {
              e.classList.toggle("prevent-input", true);
            });
        }

        this.selectedEntriesCount = this.getSelectedEntries().length;

        this.updateSelectionWrapper();

        this.selectionWrapperResizer?.setChildren(this.getSelectedEntries());
      }
      if (this.selectedEntriesCount > 0 && activateDrag) {
        this.startSelectionDrag(this.mousePositionLastRaw);
      }
    },

    setFocusOnNameInput(entry: HTMLElement | undefined = undefined) {
      entry = entry ? entry : this.getSelectedEntries()[0];
      if (!entry) return;
      let input: HTMLElement = entry.getElementsByClassName(
        "wsentry-displayname-input"
      )[0] as HTMLElement;

      /**
       * Enable input element. Will be disabled again when the entry is deselected.
       */
      document
        .querySelectorAll(".workspace-is-selected .wsentry-displayname-input")
        .forEach((e) => {
          e.classList.toggle("prevent-input", false);
        });

      if (input != undefined) {
        input.focus();
        //  input.select();
        this.moveToEntry({ zoom: true, entry: entry });
      }
    },
    toggleNameResizing(entry: HTMLElement | undefined = undefined) {
      entry = entry ? entry : this.getSelectedEntries()[0];
      let model = this.getModelEntryFromView(entry);
      model.displaynameResize = !model.displaynameResize;
    },
    deleteSelection() {
      if (this.getSelectedEntries().length == 0) {
        return;
      }

      let listIndices: number[] = [];

      this.getSelectedEntries().forEach((element) => {
        listIndices.push(Number(element.getAttribute("name")));
      });

      let payload = {
        model: <Workspace>this.model,
        listIndices,
      };

      this.$store.commit(MutationTypes.REMOVE_ENTRIES, payload);

      this.clearSelection();
    },
    startPlugin(p: AbstractPlugin): void {
      this.activePlugin = p;
      p.setWorkspace(this.getWorkspaceIfc());
      p.init();
      WSUtils.Events.pluginStarted(this.activePlugin.isModal());
    },
    cancelPlugin(): void {
      WSUtils.Events.pluginStarted(false);
      // cancel the active plugin when it allowes it
      this.activePlugin = null;
    },
    finishPlugin(): void {
      if (this.activePlugin) {
        this.activePlugin.finish();
        WSUtils.Events.pluginStarted(false);
      }
      this.activePlugin = null;
    },
    getPositionInWorkspace(e: { clientX: number; clientY: number }) {
      var rect = this.getWorkspaceWrapper().getBoundingClientRect();

      // correct coordinates by using the scaling factor of the zooming.
      var x =
        (e.clientX - rect.left - this.panZoomInstance.getTransform().x) /
        this.panZoomInstance.getTransform().scale; //x position within the element.
      var y =
        (e.clientY - rect.top - this.panZoomInstance.getTransform().y) /
        this.panZoomInstance.getTransform().scale; //y position within the element.
      return { x: x, y: y };
    },
    clearSelection: function () {
      this.entriesSelected([], "single", false);
    },
    selectAll: function () {
      let e: HTMLElement[] = this.getEntries();
      let s: HTMLElement[] = this.getSelectedEntries();
      if (e.length != s.length) {
        this.entriesSelected(e, "add", false);
      } else {
        this.entriesSelected(e, "flip", false);
      }
    },
    getNodes() {
      return this.$props.model?.entries;
    },
    panHappen: function (p: any, id: String) {
      p.setTransformOrigin(null);
      this.panZoomInstance = p;
      p.on("panzoompan", function (e: any) {});
      p.on("onDoubleClick", function (e: any) {
        return false;
      });
    },
    getSelectionRectangle: function (): Element {
      return this.$el.querySelectorAll(".rectangle-selection")[0];
    },
    getCanvas: function (): HTMLCanvasElement {
      return this.$el.querySelectorAll(".workspace-canvas")[0];
    },
    getSelectionWrapper: function (): HTMLElement {
      return this.$el.querySelectorAll(".rectangle-selection-wrapper")[0];
    },
    getWorkspaceWrapper: function (): HTMLElement {
      return this.$el.querySelectorAll(".workspace-split-wrapper")[0];
    },
    getSelectedEntries: function (): HTMLElement[] {
      return Array.from(
        this.$el.querySelectorAll(".workspace-is-selected")
      ) as HTMLElement[];
    },
    getEntries(): HTMLElement[] {
      return Array.from(
        this.$el.querySelectorAll(".ws-entry")
      ) as HTMLElement[];
    },
    getModelEntries(): WorkspaceEntry[] {
      return this.model.entries;
    },
    getUnselectedEntries(): HTMLElement[] {
      return Array.from(
        this.$el.querySelectorAll(".ws-entry:not(.workspace-is-selected)")
      ) as HTMLElement[];
    },
    getModelEntryFromView(view: HTMLElement): WorkspaceEntry {
      return this.getModelEntriesFromView([view])[0];
    },
    getModelEntriesFromView(listViews: HTMLElement[]): WorkspaceEntry[] {
      let list: WorkspaceEntry[] = [];

      for (let index = 0; index < listViews.length; index++) {
        const v = listViews[index];
        let id = Number(v.getAttribute("name"));
        let e = this.model.entries.find((e) => e.id === id);
        if (e != undefined) {
          list.push(e);
        }
      }

      return list;
    },
    getViewByID: function (id: Number): HTMLElement | null {
      let entryViews: HTMLElement[] = this.getEntries();
      for (let index = 0; index < entryViews.length; index++) {
        const v = entryViews[index];
        let idv = Number(v.getAttribute("name"));
        if (idv === id) {
          return v;
        }
      }

      return null;
    },
    getViewsByModels: function (entries: WorkspaceEntry[]): HTMLElement[] {
      let list: HTMLElement[] = [];
      let entryViews: HTMLElement[] = this.getEntries();

      first: for (let index = 0; index < entries.length; index++) {
        const e = entries[index];
        for (let k = 0; k < entryViews.length; k++) {
          const v = entryViews[k];
          let idv = Number(v.getAttribute("name"));
          if (idv === e.id) {
            list.push(v);
            continue first;
          }
        }
      }

      return list;
    },
    getCoordinatesFromElement(e: any): ElementDimensionInstance {
      return getCoordinatesFromElement(e);
    },
    startFileDrag: function () {
      let list = this.getModelEntriesFromView(this.getSelectedEntries());
      let listFilesToDrag: string[] = [];

      for (let index = 0; index < list.length; index++) {
        const e = list[index];
        listFilesToDrag.push(...e.getFilesForDragging());
      }

      if (listFilesToDrag.length > 0) {
        this.ignoreFileDrop = true;
        ipcRenderer.send("ondragstart", listFilesToDrag);
      }
    },
    updateSelectionWrapper() {
      let selectionRectangle: HTMLElement = this.getSelectionWrapper();

      let x = Infinity,
        y = Infinity,
        x2 = -Infinity,
        y2 = -Infinity;

      Array.from(this.getSelectedEntries()).forEach((el) => {
        let coord = this.getCoordinatesFromElement(el);

        x = x > coord.x ? coord.x : x;
        y = y > coord.y ? coord.y : y;

        x2 = x2 < coord.x2 ? coord.x2 : x2;
        y2 = y2 < coord.y2 ? coord.y2 : y2;
      });

      selectionRectangle.style.transform = `translate3d(${x}px, ${y}px,0px)`;
      selectionRectangle.style.width = Math.abs(x2 - x) + "px";
      selectionRectangle.style.height = Math.abs(y2 - y) + "px";

      selectionRectangle.classList.toggle(
        "wrapper-highlight",
        this.getSelectedEntries().length > 1
      );
      selectionRectangle.style.visibility =
        this.getSelectedEntries().length > 0 && this.highlightSelection
          ? "visible"
          : "hidden";

      this.drawCanvas();
    },
    getCurrentTransform(): { scale: number; x: number; y: number } {
      return this.panZoomInstance.getTransform();
    },
    updateSelectionDrag: _.throttle((e: MouseEvent, comp: any) => {
      var xOffT =
        (comp.dragMoveRel.x - e.clientX) /
        comp.panZoomInstance.getTransform().scale;
      var yOffT =
        (comp.dragMoveRel.y - e.clientY) /
        comp.panZoomInstance.getTransform().scale;

      comp.dragMoveRel = { x: e.clientX, y: e.clientY };

      for (let index = 0; index < comp.dragSelection.length; index++) {
        const e: any = comp.dragSelection[index];
        let coord = comp.getCoordinatesFromElement(e);
        e.style.transform = `translate3d(${coord.x - xOffT}px, ${
          coord.y - yOffT
        }px,0px)`;
      }
    }, 16),

    onPanStart(e: any) {
      this.drawCanvas();

      if (this.model != undefined) {
        this.model.viewportTransform = this.getCurrentTransform();
      }

      WSUtils.Events.zoom(this);
    },
    onZoom(e: any) {
      this.updateFixedZoomElements();
      this.onPanStart(e);
    },
    updateFixedZoomElements() {
      let zoomFixed: HTMLElement[] = Array.from(
        this.$el.querySelectorAll(".ws-zoom-fixed")
      ) as HTMLElement[];

      let t = this.getCurrentTransform();

      for (let index = 0; index < zoomFixed.length; index++) {
        const element: HTMLElement = zoomFixed[index];
        let s = 1 / t.scale;
        const min = 1,
          max = 50;
        s = s < min ? min : s > max ? max : s;
        element.style.transform = "scale(" + s + "," + s + ")";
      }
    },
    /**
     * Disables all inputs on the entries in the workspace view.
     */
    preventInput(prevent: boolean): void {
      this.getEntries().forEach((e) => {
        e.classList.toggle("prevent-input", prevent);
      });
    },
  },
});

var switcher = false;
</script>

<style   lang="scss">
$color-Selection: rgba(57, 215, 255, 0.3);

.transition-none {
  transition: none !important;
}

.splitpane {
  flex: 1 !important;
  width: 100%;
  height: initial !important;
}
.workspace-folder-dialog {
  position: absolute;
  z-index: 4000;
  left: 1%;
  top: 1%;
  height: 90%;
  width: 98%;
  background: rgba(200, 0, 0, 0.2);
}
.vue-pan-zoom-scene {
  cursor: default !important;
}
.workspace-menu-bar {
  position: absolute;
  z-index: 800;
  bottom: 0;
  left: 0;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  transition: all 0.3s ease-out;
  background: transparent;

  button {
    outline: none;
    color: #eee;
    border: none;
    padding: 0;
    margin: 0;
    background-color: transparent;
  }
  svg {
    filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.7));
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

/*.
Blocks input vor the content of an entry. When selected, this div will be made invisible
*/
.editor-enabler {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 500;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: background-color 0.4s ease-in-out !important;
  p {
    bottom: 150px;
    position: absolute;
    color: black;
    text-align: center;
    width: 100%;
    cursor: pointer;
  }

  &:hover {
    animation: circle 0.5s linear forwards;
  }
}

.workspace-is-selected .editor-enabler {
  display: none;
}

.prevent-input .editor-enabler {
  display: block !important;
}

.workspace-menu-bar-hide {
  svg {
    opacity: 0.02;
    &:hover {
      opacity: 1;
    }
  }
}

.welcome-message {
  pointer-events: none;
  opacity: 1;
  position: absolute;
  width: 1500px;
  height: 1000px;
  background-color: rgba(170, 170, 170, 0.211);
  color: #fff;
  text-align: center;
  transition: opacity 0.25s;

  p {
    padding: 10px;
  }

  h2 {
    top: 100px;
    font-size: 50px;
    display: block;
    position: relative;
  }

  .svg-smile {
    font-size: 60px;
    transform: translateY(20px);
  }

  .svg-file {
    font-size: 200px;
    margin-top: 190px;
  }
  .svg-folder {
    font-size: 200px;
    margin-top: 190px;
  }

  .svg-download {
    margin: 50px;
  }

  svg {
    font-size: 120px;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.3);
    }
    100% {
      transform: scale(1);
    }
  }
  .pulsating {
    animation-iteration-count: infinite;
    animation-name: pulse;
    animation-duration: 1s;
    animation-fill-mode: both;
  }
}

svg {
  cursor: pointer;
  margin: 5px 15px 5px 15px;
  padding: 5px;
  font-size: 32px;
  opacity: 1;
  transition: all 0.2s ease-in-out;
  transition-property: opacity, transform;
  &:hover {
    color: #fff;
    transform: scale(1.2);
  }
}

.transition-none {
  transition: none !important;
}

.splitpanes__pane {
  background-color: hsl(0, 0%, 8%) !important;
  transition: none !important;
  outline: none !important;
  overflow: initial !important;
}

.splitpanes__pane_transition {
  transition: width 0.2s ease-out !important;
}

.splitpanes__splitter {
  background: #646464 !important;
  min-width: 0px !important;
  border: none !important;
  transition: opacity 0.4s ease-out !important;
  &:hover {
    background: white !important;
  }
  opacity: 1;
  &.splitpanes__splitter-hide {
    opacity: 0.1 !important;
  }
}

.splitpanes__splitter:after {
  background-color: rgb(255 255 255 / 38%) !important;
}
.splitpanes__splitter:before {
  background-color: rgb(255 255 255 / 38%) !important;
}

.workspace-split-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.overview {
  position: relative;
  left: 0%;
  top: 0px;
  margin: 0px;
  height: 100%;
  width: 100%;
  overflow: hidden;
  z-index: 1000;
}

@mixin panebutton() {
  position: absolute;
  z-index: 5000;

  bottom: -6px;
  color: white;
  background: transparent;
  svg {
    transition: color 0.4s ease-out;
    margin: 0;
    font-size: 20px;
    color: #646464;
    &:hover {
      color: white;
    }
  }
}

.pane-button-ws {
  @include panebutton;
  right: -2px;
}

.pane-button-ov {
  @include panebutton;
  left: -2px;
}

.search-not-found {
  opacity: 0.05;
  pointer-events: none;
}

.workspace-search {
  position: absolute;
  border: none;
  border-bottom: none;
  border-top: none;
  background: none;
  padding-top: 0px;
  padding-bottom: 0px;
  width: 100%;
  z-index: 4000;
  height: 28px;

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
    pointer-events: all;
    background: #222;
    height: 28px;
    border: none;
    outline: none;
    color: #eee;
    margin-top: 4px;
    border: 1px solid #333;
    border-radius: 4px;
    position: relative;
    padding: 0;
    padding-left: 7px;
    opacity: 0.3;
    transition: opacity 0.3s ease-out;

    &:hover {
      opacity: 1;
    }
    &:focus {
      opacity: 1;
    }
  }
  .search-results {
    background: #222;
    position: absolute;
    top: 100%;
    left: 33.33%;
    width: 33.33%;
    min-height: 10px;
    max-height: 350px;
    overflow-x: hidden;
    overflow-y: auto;
    color: #eee;
    padding: 0;
    box-sizing: border-box;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    border: 1px solid #333;
    border-top: none;
  }
}

@mixin theme() {
  width: 15px;
  height: 15px;
  background: rgba(218, 218, 218, 0);
  position: absolute;
  z-index: 5000;
  pointer-events: all;
  padding: 0;
  margin: 0;
}

div .resizer-top-right {
  @include theme;
  top: 0;
  right: 0;
  cursor: ne-resize;
}
div .resizer-bottom-right {
  @include theme;
  bottom: -10px;
  right: -10px;
  transform-origin: center;
  cursor: se-resize;
  width: auto;
  height: auto;
  svg {
    cursor: se-resize;
    font-size: 24px;
    margin: 0;
    color: #fff;
    padding: 0;
  }
}
div .selection-system-drag {
  @include theme;
  top: 35px;
  left: -35px;
  transform-origin: right top;
  cursor: grab;
  width: auto;
  height: auto;
  svg {
    cursor: grab;
    font-size: 24px;
    margin: 0;
    color: #fff;
    padding: 0;
  }
}

button {
  border: none;
  outline: none;
}

div .resizer-bottom-left {
  @include theme;
  bottom: 0;
  left: 0;
  cursor: ne-resize;
}
div .resizer-top-left {
  @include theme;
  top: 0;
  left: 0;
  cursor: se-resize;
}

.rectangle-selection {
  position: absolute;
  width: 0px;
  height: 0px;
  transform: translate3d(0px, 0px, 0px);
  background-color: $color-Selection;
  z-index: 1000;
  visibility: hidden;
}

.rectangle-selection-wrapper {
  position: absolute;
  width: 0px;
  height: 0px;
  transform: translate3d(0px, 0px, 0px);

  z-index: 4000;
  padding: 10px;
  margin: -10px;
  visibility: hidden;
  pointer-events: none;
}

.wrapper-highlight {
  border: 2px solid $color-Selection;
}

/**
A top selection bar for entries to make them more easily selectable. 
 */
.ws-window-bar-top {
  width: 100%;
  height: 25px;
  transition: background-color 0.4s ease-in-out !important;
  transform-origin: top left;
  //  background-color: rgb(255, 255, 255);
}

@keyframes circle {
  0% {
    background-color: none;
  }
  50% {
    background-color: $color-Selection;
  }
  100% {
    background-color: none;
  }
}

/**
visually highlights elements for selection with a hover effect
 */
.select-element {
  cursor: pointer;
  &:hover {
    animation: circle 0.5s linear forwards;
  }
}

.close-file {
  opacity: 0;
  transition: all 0.25s;
}

.blend-out {
  opacity: 0;
  transition: all 0.25s;
}

.wrapper {
  overflow: hidden;
  flex: 1 !important;
  width: 100%;
  height: initial !important;

  display: flex;
  flex-flow: column;
  position: relative;
  background-color: rgba(53, 53, 53, 0);
  outline: none;

  .zoomable {
    animation: fade-in 0.25s ease;
  }

  canvas {
    pointer-events: none;
    position: absolute;
    left: 0;
    top: 0;
    z-index: 780; // behind menu bar
  }
}

.vue-pan-zoom-item {
  width: 100%;
  height: 100%;
}

.vue-pan-zoom-scene {
  outline: none;
  width: 100%;
  height: 100%;
  position: absolute;
  padding: 0;
  margin: 0;

  // old
  // outline: none;
  // width: 100%;
  // height: 100%;
  // position: fixed;
  // padding: 0;
  // margin: 0;
}

@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.ws-entry {
  transition: opacity 0.3s ease-in-out;
  position: absolute;
  // filter: drop-shadow(5px 5px 2px  #000000);
}

.position-zero {
  width: 100px;
  height: 100px;
  position: absolute;
  background-color: yellow;
  transform: translate3d(0, 0, 0);
}
</style>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped  lang="scss">
</style>
