
<template>
  <div
    @keydown="keydown"
    @keyup="keyup"
    @mouseup="mouseup"
    @mousedown="mousedown"
    @mousemove.capture="mousemove"
    @click.stop
    @dragover="dragover"
    @dragleave="dragleave"
    @drop="drop"
    class="wrapper"
  >
    <canvas class="workspace-canvas"></canvas>

    <panZoom
      @paste="onPaste"
      @init="panHappen"
      @pan="onPanStart"
      @zoom="onZoom"
      :options="{
        zoomDoubleClickSpeed: 1,
        minZoom: 0.03,
        maxZoom: 2,
        bounds: false,
        initialX: model.viewportTransform.x,
        initialY: model.viewportTransform.y,
        initialZoom: model.viewportTransform.scale,
        beforeWheel: beforeWheelHandler,
        beforeMouseDown: beforeMouseDownHandler,
      }"
      selector=".zoomable"
    >
      <div class="zoomable close-file-anim">
        <div class="rectangle-selection"></div>
        <div class="rectangle-selection-wrapper">
          <button class="ws-zoom-fixed resizer-bottom-right">
            <ResizeBottomRight />
          </button>
        </div>

        <keep-alive>
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
        </keep-alive>
      </div>
    </panZoom>

    <OverviewView
      class="overview"
      :class="{ 'ov-open': model.overviewOpen }"
      @dblclick.capture.stop="openOverview"
      :model="model"
    />

    <wsentriesbookmarks
      :model="model"
      @bookmarkclicked="moveToEntry"
    ></wsentriesbookmarks>

    <div class="workspace-search" v-show="getShowUI">
      <div></div>
      <input
        @keydown.stop
        @keyup.stop
        @focus="searchfocusSet(true)"
        @blur="searchfocusSet(false)"
        class="workspace-search-input"
        type="search"
        @input="searchUpdate"
        @paste="onPaste"
        v-model="searchString"
        placeholder="Suche..."
      />
      <div></div>
      <wssearchlist
        class="search-results"
        v-if="searchActive"
        :model="model"
        :searchString="searchString"
        @bookmarkclicked="moveToEntry"
      ></wssearchlist>
    </div>

    <div
      @mousedown.stop
      @mouseup.stop
      class="workspace-menu-bar"
      :class="{ 'workspace-menu-bar-hide': !getShowUI }"
    >
      <button :disabled="model.entries.length == 0">
        <Overscan @click="showAll" />
      </button>
      <button><Group @click="createEntry('frame')" /></button>
      <button><youtube @click="createEntry('youtube')" /></button>
      <button><CommentTextOutline @click="createEntry('text')" /></button>
      <!-- <button
        style="transform: rotate(90deg)"
        :disabled="selectedEntriesCount == 0"
      >
        <arrow-expand />
      </button> -->

      <button :disabled="selectedEntriesCount < 2"><BorderAll /></button>
      <button
        @click="setFocusOnNameInput(undefined)"
        :disabled="selectedEntriesCount != 1"
      >
        <FormTextbox />
      </button>
      <button
        @click="toggleNameResizing()"
        :disabled="selectedEntriesCount != 1"
      >
        <FormatSize />
      </button>
      <button :disabled="selectedEntriesCount == 0">
        <delete-empty-outline @click="deleteSelection" />
      </button>
    </div>
  </div>
</template>


<script lang="ts">
import { ipcRenderer } from "electron";
import {
  Workspace,
  WorkspaceEntry,
  WorkspaceEntryFile,
  WorkspaceEntryFolderWindow,
  WorkspaceEntryFrame,
  WorkspaceEntryImage,
  WorkspaceEntryTextArea,
  WorkspaceEntryYoutube,
} from "@/store/model/Workspace";
import { MutationTypes } from "@/store/mutations/mutation-types";
import WorkspacePlugin from "./Plugins/AbstractPlugin";
import ReArrange from "./Plugins/Rearrange";
import * as WSUtils from "./WorkspaceUtils";
import OverviewCanvas from "./../overview/OverviewCanvas.vue";
import OverviewView from "./../overview/OverviewView.vue";
import wsentriesbookmarks from "./WorkspaceEntriesBookmarks.vue";
import wssearchlist from "./WorkspaceSeachList.vue";
import { defineComponent } from "vue";
import {
  editElementDimension,
  ElementDimension,
  getCoordinatesFromElement,
  ResizerComplex,
} from "@/utils/resize";
import { InsightFile } from "@/store/state";
import { deserialize, serialize } from "class-transformer";
import _ from "underscore";
import { WorkspaceViewIfc } from "./WorkspaceUtils";
import AbstractPlugin from "./Plugins/AbstractPlugin";
import { OverviewEngine } from "./overview/OverviewEngine";
const fs = require("fs");
const path = require("path");

let points: { x: number; y: number; z: number }[] = [];

for (let index = 0; index < 100; index++) {
  points.push({
    x: (Math.random() * 1000 - 500) * 2,
    y: (Math.random() * 1000 - 500) * 2,
    z: Math.random(),
  });
}

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
} from "mdue";
export default defineComponent({
  el: ".wrapper",
  name: "WorkspaceView",
  components: {
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
    wsentriesbookmarks,
    wssearchlist,
    OverviewCanvas,
    OverviewView,
  },
  props: {
    model: {
      type: Workspace,
      required: true,
    },
  },
  data(): {
    activePlugin: WorkspacePlugin | null;
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
  } {
    return {
      highlightSelection: true,
      activePlugin: null,
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
    highlightSelection(newValue: boolean, oldValue: boolean) {
      this.updateSelectionWrapper();
    },
  },
  mounted() {
    /**
     * Listen for resizing of the canvas parent element
     */
    this.divObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      for (let index = 0; index < entries.length; index++) {
        const e = entries[index];
        e.target; // div element
        let w = Math.max(10, e.contentRect.width);
        let h = Math.max(10, e.contentRect.height);

        //  vm.getCanvas().style.width = `${w}px`;
        // vm.getCanvas().style.width = `${h}px`;
        vm.getCanvas().width = w;
        vm.getCanvas().height = h;

        vm.drawCanvas();
      }
    });
    this.divObserver.observe(this.$el);

    this.selectionWrapperResizer = new ResizerComplex(
      this.getSelectionWrapper(),
      this.getSelectionWrapper().firstChild as HTMLElement,
      this,
      () => {
        this.getEntries().forEach((e) => {
          e.classList.add("prevent-input");
        });
      },
      () => {
        this.drawCanvas();
      },
      () => {
        this.getEntries().forEach((e) => {
          e.classList.remove("prevent-input");
        });
      }
    );

    let vm = this;
    // window.onresize = function () {
    //   vm.getCanvas().style.width = `${vm.$el.clientWidth}px`;
    //   vm.getCanvas().style.width = `${vm.$el.clientWidth}px`;
    //   vm.getCanvas().width = vm.$el.clientWidth;
    //   vm.getCanvas().height = vm.$el.clientHeight;
    // };

    vm.getCanvas().width = vm.$el.clientWidth;
    vm.getCanvas().height = vm.$el.clientHeight;

    this.drawCanvas();
  },
  unmounted() {
    this.divObserver.disconnect();
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
      startDrag: this.startDrag,
      entrySelected: this.entrySelected,
    };
  },
  inject: ["loadInsightFileFromPath", "loadInsightFileFromPath"],
  methods: {
    searchfocusSet(f: boolean): void {
      if (f) {
        this.searchfocus = true;
      } else {
        setTimeout(() => {
          this.searchfocus = false;
        }, 400);
      }
    },
    openOverview(e: MouseEvent): void {
      let div: HTMLElement = this.$el.getElementsByClassName("overview")[0];
      this.model.overviewOpen = !this.model.overviewOpen;

      if (this.model.overviewOpen) {
        div.classList.toggle("overview-hover", false);
      } else {
        setTimeout(() => {
          div.classList.toggle("overview-hover", true);
        }, 1500);
      }
      e.preventDefault();
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
      let canvas: HTMLCanvasElement = this.getCanvas() as HTMLCanvasElement;

      let context = canvas.getContext("2d");

      if (context == null) {
        return;
      }

      let b = Math.min(
        Math.max(15, 50 * (this.getCurrentTransform().scale * 10)),
        90
      );
      b = 70;
      context.fillStyle = "rgb(" + b + "," + b + "," + (b + 5) + ")";

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillRect(0, 0, canvas.width, canvas.height);

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

          var rect = e.getBoundingClientRect();
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
    onPaste(e: ClipboardEvent) {
      console.log(e.clipboardData?.getData("text"));

      e.preventDefault();
      let text = e.clipboardData?.getData("text");

      var mousePos = this.mousePositionLast;

      if (text != undefined && text.includes("youtube.com")) {
        let listFiles: Array<WorkspaceEntry> = [];
        let payload = {
          model: <Workspace>this.model,
          listFiles,
        };
        listFiles.push(new WorkspaceEntryYoutube(text));

        var mousePos = this.mousePositionLast;
        listFiles[0].x = mousePos.x;
        listFiles[0].y = mousePos.y;

        this.$store.commit(MutationTypes.ADD_FILES, payload);
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

      if (this.activePlugin && this.activePlugin.keydown(e)) {
        return;
      }

      if (e.altKey) {
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
            if (this.model) {
              let index = 0,
                indexModel = 0;

              for (let entry of this.model.entries) {
                index = entry.displayname.length > 0 ? index + 1 : index;
                if (index === Number(e.key)) {
                  this.moveToEntry({ zoom: false, index: indexModel });
                  break;
                }
                indexModel++;
              }
            }
            break;
        }
      }

      if (!e.altKey && !e.ctrlKey) {
        switch (e.key) {
          case "s":
            this.openOverview(new MouseEvent("down"));
            break;
          case " ":
            if (e.repeat) {
              return;
            }
            this.getEntries().forEach((e) => {
              e.classList.toggle("prevent-input", true);
            });
            this.spacePressed = true;
            this.showAll();
            break;
        }
      }
    },
    keyup(e: KeyboardEvent) {
      if (this.activePlugin && this.activePlugin.keyup(e)) {
        return;
      }

      let listFiles: Array<WorkspaceEntry> = [];
      switch (e.key) {
        case "r":
          if (this.getSelectedEntries().length > 1) {
            this.startPlugin(new ReArrange(this));
          }
          break;
        case " ":
          if (this.spacePressed) {
            if (this.oldViewRect) {
              let bound = this.getPanzoomRect(this.oldViewRect);
              this.panZoomInstance.smoothShowRectangle(bound);
            }
            this.getEntries().forEach((e) => {
              e.classList.toggle("prevent-input", false);
            });
            this.spacePressed = false;
          }
          break;
        case "Delete":
        case "delete":
          this.deleteSelection();
          break;
        case "a":
          if (e.ctrlKey) {
            this.selectAll();
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
        default:
      }

      this.drawCanvas();
    },
    createEntry(
      type: "frame" | "text" | "youtube",
      useMousePosition: boolean = false
    ) {
      let viewport = this.getViewport();
      let doPositioning = true;
      let listFiles: Array<WorkspaceEntry> = [];
      let payload = {
        model: <Workspace>this.model,
        listFiles,
      };
      switch (type) {
        case "youtube":
          listFiles.push(new WorkspaceEntryYoutube());
          break;
        case "text":
          listFiles.push(new WorkspaceEntryTextArea());
          break;
        case "frame":
          let frame = new WorkspaceEntryFrame();
          listFiles.push(frame);

          if (this.getSelectedEntries().length > 0) {
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

            let padding = 80;
            frame.x = x - padding;
            frame.y = y - padding;
            frame.width = Math.abs(x2 - x) + padding * 2;
            frame.height = Math.abs(y2 - y) + padding * 2;
            doPositioning = false;
          }
          break;
        default:
          break;
      }

      if (doPositioning) {
        listFiles.forEach((f) => {
          if (useMousePosition) {
            f.x = this.mousePositionLast.x;
            f.y = this.mousePositionLast.y;
          } else {
            f.x = viewport.x + viewport.w / 2 - f.width / 2;
            f.y = viewport.y + viewport.h / 2 - f.height / 2;
          }
        });
      }

      this.$store.commit(MutationTypes.ADD_FILES, payload);
    },
    startDrag: function (e: MouseEvent) {
      this.selectionDragActive = true;

      /**
       * Start dragging of the current selection with left mouse button + ctrl or
       */
      this.dragMoveRel = { x: e.clientX, y: e.clientY };

      this.dragSelection = Array.from(
        this.getSelectedEntries()
      ) as HTMLElement[];

      WSUtils.Events.dragStarting(this.dragSelection, this);

      this.selectionWrapperResizer?.setChildren(this.dragSelection);

      this.dragSelection.push(this.getSelectionWrapper());

      this.preventInput(true);
    },
    startSelectionDrag(mousePosition: { x: number; y: number }) {
      this.dragMoveRel = mousePosition;
      this.selectionDragActive = true;
      /**
       * Start dragging of the current selection with left mouse button + ctrl or
       */

      this.dragSelection = Array.from(
        this.getSelectedEntries()
      ) as HTMLElement[];

      WSUtils.Events.dragStarting(this.dragSelection, this);

      this.selectionWrapperResizer?.setChildren(this.dragSelection);

      this.dragSelection.push(this.getSelectionWrapper());

      this.preventInput(true);
    },
    mousedown: function (e: MouseEvent) {
      if (this.activePlugin && this.activePlugin.mousedown(e)) {
        return;
      }

      if (this.spacePressed) {
        this.spacePressed = false;
        this.getEntries().forEach((e) => {
          e.classList.toggle("prevent-input", false);
        });
        let rect: ClientRect = this.$el.getBoundingClientRect();
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
        // this.dragMoveRel = { x: e.clientX, y: e.clientY };
        // this.selectionDragActive = true;
        // /**
        //  * Start dragging of the current selection with left mouse button + ctrl or
        //  */

        // this.dragSelection = Array.from(
        //   this.getSelectedEntries()
        // ) as HTMLElement[];

        // WSUtils.Events.dragStarting(this.dragSelection, this);

        // this.selectionWrapperResizer?.setChildren(this.dragSelection);

        // this.dragSelection.push(this.getSelectionWrapper());

        // this.preventInput(true);

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
    mousemove: function (e: MouseEvent) {
      if (this.activePlugin && this.activePlugin.mousemove(e)) {
        return;
      }
      let comp = this;

      this.mousePositionLastRaw = { x: e.clientX, y: e.clientY };
      this.mousePositionLast = comp.getPositionInWorkspace(e);

      let selectionRectangle: any = comp.getSelectionRectangle();

      function updateSelectionRectangle() {
        let w = -1 * (comp.dragStart.x - comp.getPositionInWorkspace(e).x);
        let h = -1 * (comp.dragStart.y - comp.getPositionInWorkspace(e).y);

        let rectX = w < 0 ? comp.dragStart.x + w : comp.dragStart.x;
        let rectY = h < 0 ? comp.dragStart.y + h : comp.dragStart.y;

        selectionRectangle.style.transform = `translate3d(${rectX}px, ${rectY}px,0px)`;
        selectionRectangle.style.width = Math.abs(w) + "px";
        selectionRectangle.style.height = Math.abs(h) + "px";
      }

      if (this.selectionDragActive) {
        this.updateSelectionDrag(e, this);
      } else {
        if (selectionRectangle.style.visibility === "visible") {
          this.isSelectionEvent = true;
          updateSelectionRectangle();
        }
      }

      this.drawCanvas();
    },
    mouseup: function (e: MouseEvent) {
      if (this.activePlugin && this.activePlugin.mouseup(e)) {
        return;
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
    beforeWheelHandler(e: any) {
      if (this.activePlugin && this.activePlugin.mouseWheel(e)) {
        return true;
      }
      this.spacePressed = false;
      this.getEntries().forEach((e) => {
        e.classList.toggle("prevent-input", false);
      });
      var shouldIgnore: boolean = e.altKey;
      return shouldIgnore;
    },
    beforeMouseDownHandler(e: any) {
      if (this.activePlugin && this.activePlugin.mousedownPan(e)) {
        return true;
      }
      var shouldIgnore: boolean = !(e.altKey || e.button == 1);

      return shouldIgnore;
    },
    dragover(e: any) {
      if (this.activePlugin && this.activePlugin.dragover(e)) {
        return;
      }
      e.preventDefault();
      // Add some visual fluff to show the user can drop its files
      // if (!e.currentTarget.classList.contains("bg-green-300")) {
      //   e.currentTarget.classList.remove("bg-gray-100");
      //   e.currentTarget.classList.add("bg-green-300");
      // }
    },
    dragleave(e: any) {
      if (this.activePlugin && this.activePlugin.dragleave(e)) {
        return;
      }
      // Clean up
      // e.currentTarget.classList.add("bg-gray-100");
      // e.currentTarget.classList.remove("bg-green-300");
    },
    drop(e: any) {
      if (this.activePlugin && this.activePlugin.drop(e)) {
        return;
      }
      e.preventDefault();
      console.log(e.dataTransfer.files);

      let listFiles: Array<WorkspaceEntry> = [];

      e.dataTransfer.files.forEach((f: any) => {
        const fileStat = fs.lstatSync(f.path);
        const p = path.normalize(f.path).replace(/\\/g, "/");

        if (fileStat.isDirectory()) {
          listFiles.push(new WorkspaceEntryFolderWindow(p));
        } else {
          if (
            f.path.endsWith("jpg") ||
            f.path.endsWith("jpeg") ||
            f.path.endsWith("png")
          ) {
            listFiles.push(new WorkspaceEntryImage(p));
          } else if (f.path.endsWith("ins")) {
            // @ts-ignore: Unreachable code error
            this.loadInsightFileFromPath(p);
          } else {
            listFiles.push(new WorkspaceEntryFile(p));
          }
        }
      });

      // get drop position
      var rect = this.$el.getBoundingClientRect();
      // var rect = { left: 0, top: 0 };
      // correct coordinates by using the scaling factor of the zooming.
      var x = this.getPositionInWorkspace(e).x; //x position within the element.
      var y = this.getPositionInWorkspace(e).y; //y position within the element.

      var payload = {
        model: <Workspace>this.model,
        listFiles,
      };

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

      let mX = x + offsetWMax / 2;
      mX -= window.innerWidth / this.panZoomInstance.getTransform().scale / 2;
      mX *= this.panZoomInstance.getTransform().scale;
      mX *= -1;

      let mY = y + offsetHMax / 2;
      mY -= window.innerHeight / this.panZoomInstance.getTransform().scale / 2;
      mY *= this.panZoomInstance.getTransform().scale;

      mY *= -1;

      this.$store.commit(MutationTypes.ADD_FILES, payload);
    },
    getBounds(entries: HTMLElement[]): ElementDimension {
      let x = Infinity,
        y = Infinity,
        x2 = -Infinity,
        y2 = -Infinity;

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

      let rect: ClientRect = this.$el.getBoundingClientRect();

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
    showAll() {
      if (this.getEntries().length == 0) {
        return;
      }

      this.oldViewRect = this.getViewport();

      let bound = this.getPanzoomRect(this.getBounds(this.getEntries()), 0.2);
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
        let coordinates = this.getCoordinatesFromElement(entry);

        let scaler = 0.25;

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
          this.$el.clientWidth / 2;
        let y =
          (-coordinates.y - coordinates.w / 2) *
            this.getCurrentTransform().scale +
          this.$el.clientHeight / 2;

        if (payload.zoom) {
          this.panZoomInstance.setMaxZoom(1);
          this.panZoomInstance.smoothShowRectangle(rect).then((f: boolean) => {
            // this.panZoomInstance.smoothZoomAbs(this.getCurrentTransform().x, this.getCurrentTransform().y, 1);
          });
        } else {
          this.panZoomInstance.smoothMoveTo(x, y);
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
       * Do not select entries that do not fit to the search
       */
      entries = entries.filter(
        (e) => !e.classList.contains("search-not-found")
      );

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

      if (this.getSelectedEntries().length > 1) {
        document
          .querySelectorAll("div.ws-entry .wsentry-displayname")
          .forEach((e) => {
            e.classList.toggle("prevent-input", true);
          });
      } else {
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

      if (this.selectedEntriesCount > 0 && activateDrag) {
        this.startSelectionDrag(this.mousePositionLastRaw);
      }
    },
    setFocusOnNameInput(entry: HTMLElement | undefined = undefined) {
      entry = entry ? entry : this.getSelectedEntries()[0];

      let input: HTMLInputElement = entry.getElementsByClassName(
        "wsentry-displayname"
      )[0] as HTMLInputElement;

      /**
       * Enable input element. Will be disabled again when the entry is deselected.
       */
      document
        .querySelectorAll(".workspace-is-selected .wsentry-displayname")
        .forEach((e) => {
          e.classList.toggle("prevent-input", false);
        });

      if (input != undefined) {
        input.focus();
        input.select();
        this.moveToEntry({ zoom: true, entry: entry });
      }
    },
    toggleNameResizing(entry: HTMLElement | undefined = undefined) {
      entry = entry ? entry : this.getSelectedEntries()[0];

      let input: HTMLInputElement = entry.getElementsByClassName(
        "wsentry-displayname"
      )[0] as HTMLInputElement;

      let model = this.getModelEntryFromView(entry);
      model.displaynameResize = !model.displaynameResize;

      setTimeout(() => {
        this.updateFixedZoomElements();
        if (!model.displaynameResize) {
          input.style.transform = "scale(" + 1 + ", " + 1 + ")";
        }
      }, 10);
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
      var rect = this.$el.getBoundingClientRect();

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
      p.set;
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
    getSelectedEntries: function (): HTMLElement[] {
      return Array.from(
        this.$el.querySelectorAll(".workspace-is-selected")
      ) as HTMLElement[];
    },
    getEntries: function (): HTMLElement[] {
      return Array.from(
        this.$el.querySelectorAll(".ws-entry")
      ) as HTMLElement[];
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
      let list: WorkspaceEntry[] = [];

      for (let index = 0; index < this.getEntries().length; index++) {
        const v = this.getEntries()[index];
        let idv = Number(v.getAttribute("name"));
        if (idv === id) {
          return v;
        }
      }

      return null;
    },
    getCoordinatesFromElement(e: any): ElementDimension {
      return getCoordinatesFromElement(e);
    },
    startFileDrag: function (e: MouseEvent) {
      e.preventDefault();

      let list = this.getModelEntriesFromView(this.getSelectedEntries());
      let listFilesToDrag: string[] = [];

      for (let index = 0; index < list.length; index++) {
        const e = list[index];
        listFilesToDrag.push(...e.getFilesForDragging());
      }

      console.log("send files to drag");
      console.log(listFilesToDrag);

      if (listFilesToDrag.length > 0) {
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
    },
    onZoom(e: any) {
      this.updateFixedZoomElements();
      this.onPanStart(e);

      WSUtils.Events.zoom(this);
    },
    updateFixedZoomElements() {
      let zoomFixed: HTMLElement[] = Array.from(
        this.$el.querySelectorAll(".ws-zoom-fixed")
      ) as HTMLElement[];

      let t = this.getCurrentTransform();

      console.log(zoomFixed.length);

      for (let index = 0; index < zoomFixed.length; index++) {
        const element: HTMLElement = zoomFixed[index];
        let s = 1 / t.scale;
        s = s < 1 ? 1 : s > 16 ? 16 : s;
        element.style.transform = "scale(" + s + "," + s + ")";
      }
    },

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

.workspace-menu-bar {
  position: absolute;
  z-index: 800;
  bottom: 10px;
  left: 0;
  text-align: center;
  width: 100%;

  button {
    outline: none;
    color: white;
    border: none;
    padding: 0;
    margin: 0;
    background-color: transparent;
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
  background: rgba(255, 255, 255, 0.05);
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
    transition: background-color 0.4s ease-in-out !important;
    background-color: $color-Selection !important;
  }
}

.workspace-is-selected .editor-enabler {
  display: none;
}

.workspace-menu-bar-hide {
  svg {
    opacity: 0.05;
    &:hover {
      opacity: 1;
    }
  }
}

svg {
  cursor: pointer;
  margin: 5px 15px 5px 15px;
  padding: 5px;
  font-size: 32px;

  transition: all 0.2s ease-in-out;
  &:hover {
    color: #ccc;
    transform: scale(1.25);
  }
}

.overview {
  position: absolute;
  right: 0px;
  top: 0px;
  margin: 35px;
  margin-right: 7px;
  height: 100px;
  width: 100px;
  transition: all 0.6s;
  transition-timing-function: cubic-bezier(0.58, -0.315, 0.285, 1.65);
  overflow: hidden;
  z-index: 8000;
}

.overview-hover {
  &:hover {
    height: 140px;
    width: 140px;
    margin: 35px;
    margin-right: 7px;
  }
}

.ov-open {
  right: 0px;
  top: 0px;
  margin: 0px;
  width: 100%;
  height: 100%;

  &:hover {
    width: 100%;
    height: 100%;
    margin: 0px;
  }
}

.search-not-found {
  opacity: 0.05;
  pointer-events: none;
}

.workspace-search {
  position: absolute;
  border: none;
  background: #fff;
  padding-top: 0px;
  padding-bottom: 0px;
  width: 100%;
  z-index: 4000;

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

.ws-zoom-fixed {
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
  bottom: 0;
  right: 0;
  transform-origin: right bottom;
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

.wsentry-displayname {
  transform-origin: left bottom;
  position: absolute;
  left: 0px;
  margin-left: 1px;
  top: -40px;
  width: auto;
  z-index: 20;

  background-color: transparent;
  border: none;
  color: rgb(230, 230, 230);
  font-size: 25pt;
  overflow: visible;
  outline: none;
  transition: background-color 500ms linear;
  input {
    outline: none;
    color: rgb(233, 214, 107);
  }
  // &:hover {
  //   background-color: rgba(102, 224, 255, 0.479);
  // }
}

/**
A top selection bar for entries to make them more easily selectable. 
 */
.ws-window-bar-top {
  width: 100%;
  height: 25px;
  transition: background-color 0.4s ease-in-out !important;
  background-color: rgb(255, 255, 255);
}

/**
visually highlights elements for selection with a hover effect
 */
.select-element {
  cursor: pointer;
  transition: background-color 0.4s ease-in-out !important;

  &:hover {
    transition: background-color 0.4s ease-in-out !important;
    background-color: $color-Selection !important;
  }
}

.wrapper {
  overflow: hidden;
  flex: 1 !important;
  width: 100%;
  height: initial !important;
  position: relative;
  background-color: rgba(53, 53, 53, 0);
  outline: none;

  .close-file {
    opacity: 0;
    transition: all 0.25s;
  }

  .zoomable {
    animation: fade-in 0.25s ease;
  }

  canvas {
    // pointer-events: none;
    position: absolute;
    left: 0;
    top: 0;
  }
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
}

.vue-pan-zoom-scene {
  outline: none;
  width: 100%;
  height: 100%;
  position: fixed;
  padding: 0;
  margin: 0;
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
