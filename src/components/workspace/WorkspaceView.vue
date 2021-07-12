
<template>
  <div
    contenteditable="true"
    @paste.stop="onpaste"
    @keyup="keymonitor"
    @mouseup="dragMouseUp"
    @mousedown="dragMouseDown"
    @mousemove="dragMouseMove"
    @dragover="dragover"
    @dragleave="dragleave"
    @drop="drop"
    @click.stop
    class="wrapper workspace"
  >
    <!-- Ohne selector hat es nicht funktioniert, weil er dann passendes dom element findet -->
    <panZoom
      @paste="onpaste"
      @init="panHappen"
      @pan="onPanStart"
      @zoom="onPanStart"
      :options="{
        zoomDoubleClickSpeed: 1,
        minZoom: 0.03,
        maxZoom: 6,
        bounds: false,
        initialX: model.initialX,
        initialY: model.initialY,
        initialZoom: model.initialZoom,
        beforeWheel: beforeWheelHandler,
        beforeMouseDown: beforeMouseDownHandler,
      }"
      selector=".zoomable"
    >
      <div class="zoomable">
        <div class="rectangle-selection"></div>
        <div class="rectangle-selection-wrapper"></div>

        <keep-alive>
          <wsentries :viewId="model.id" :model="model"></wsentries>
        </keep-alive>
      </div>
    </panZoom>
  </div>
</template>


<script lang="ts">
//       <div class="position-zero"></div>
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
import * as WSUtils from "./WorkspaceUtils";
import { defineComponent } from "vue";
import wsentries from "./WorkspaceEntries.vue";

const fs = require("fs");
const path = require("path");

export default defineComponent({
  el: "#wrapper",
  name: "WorkspaceView",
  components: {
    wsentries,
  },
  props: {
    model: Workspace,
  },
  data(): {
    dragStart: { x: number; y: number };
    dragMoveRel: { x: number; y: number };
    dragTempOffset: { x: number; y: number };
    mouseDownB: boolean;
    isSelectionEvent: boolean;
    panZoomInstance: any;
    mousePositionLast: { x: number; y: number };
    dragSelection: Element[];
  } {
    return {
      mousePositionLast: { x: 0, y: 0 },
      dragMoveRel: { x: 0, y: 0 },
      dragStart: { x: 0, y: 0 },
      dragTempOffset: { x: 0, y: 0 },
      mouseDownB: false,
      isSelectionEvent: false,
      panZoomInstance: null,
      dragSelection: [],
    };
  },

  computed: {},
  provide() {
    return {
      entrySelected: this.entrySelected,
    };
  },
  methods: {
    onpaste(e: ClipboardEvent) {
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
    keymonitor(e: KeyboardEvent) {
      let listFiles: Array<WorkspaceEntry> = [];
      switch (e.key) {
        case "a":
          //  if (e.ctrlKey) {
          console.log(e);
          this.selectAll();
          // }
          break;
        case "t":
          let payload = {
            model: <Workspace>this.model,
            listFiles,
          };

          let area = new WorkspaceEntryTextArea();
          area.x = this.mousePositionLast.x;
          area.y = this.mousePositionLast.y;
          listFiles.push(area);

          this.$store.commit(MutationTypes.ADD_FILES, payload);

          break;
        case "f":
          payload = {
            model: <Workspace>this.model,
            listFiles,
          };

          let frame = new WorkspaceEntryFrame();
          frame.x = this.mousePositionLast.x;
          frame.y = this.mousePositionLast.y;
          listFiles.push(frame);

          this.$store.commit(MutationTypes.ADD_FILES, payload);

          break;
        case "1":
          this.panZoomInstance.smoothMoveTo(0, 0);
          break;
        case "2":
          this.panZoomInstance.smoothMoveTo(100, 100);
          break;
        case "3":
          this.panZoomInstance.smoothMoveTo(200, 200);
          break;
        case "4":
          // this.panZoomInstance.smoothZoomAbs(0, 0, 1.0);
          this.panZoomInstance.smoothMoveTo(0, 0);
          break;
        case "5":
          //  this.panZoomInstance.smoothZoomAbs(100, 100, 1.0);
          this.panZoomInstance.smoothMoveTo(100, 100);
          break;
        case "6":
          //  this.panZoomInstance.smoothZoomAbs(200, 200, 1.0);
          this.panZoomInstance.smoothMoveTo(200, 200);
          break;
        default:
      }
    },
    entrySelected(entry: any, type: "add" | "single" | "flip") {
      console.log("type: " + type + Math.random());
      switch (type) {
        case "add":
          entry.classList.add("workspace-is-selected");
          break;
        case "single":
          this.clearSelection();
          entry.classList.add("workspace-is-selected");
          break;
        case "flip":
          // ctrl click on an entry
          entry.classList.toggle("workspace-is-selected");
          break;
      }
      this.updateSelectionWrapper();
    },
    dragover(e: any) {
      e.preventDefault();
      // Add some visual fluff to show the user can drop its files
      if (!e.currentTarget.classList.contains("bg-green-300")) {
        e.currentTarget.classList.remove("bg-gray-100");
        e.currentTarget.classList.add("bg-green-300");
      }
    },
    dragleave(e: any) {
      // Clean up
      e.currentTarget.classList.add("bg-gray-100");
      e.currentTarget.classList.remove("bg-green-300");
    },
    drop(e: any) {
      e.preventDefault();
      console.log(e.dataTransfer.files);

      let listFiles: Array<WorkspaceEntry> = [];

      e.dataTransfer.files.forEach((f: any) => {
        const fileStat = fs.lstatSync(f.path);
        if (fileStat.isDirectory()) {
          listFiles.push(new WorkspaceEntryFolderWindow(f.path));
        } else {
          if (
            f.path.endsWith("jpg") ||
            f.path.endsWith("jpeg") ||
            f.path.endsWith("png")
          ) {
            listFiles.push(new WorkspaceEntryImage(f.path));
          } else {
            listFiles.push(new WorkspaceEntryFile(f.path));
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

      // this.panZoomInstance.smoothMoveTo(mX, mY);
      //   this.panZoomInstance.smoothZoomAbs(-mX, -mY, 1);

      this.$store.commit(MutationTypes.ADD_FILES, payload);
    },
    getPositionInWorkspace(e: any) {
      // get drop position
      var rect = this.$el.getBoundingClientRect();
      // var rect = { left: 0, top: 0 };
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
      // if (this.isSelectionEvent) {
      //   this.isSelectionEvent = false;
      //   return;
      // }
      console.log("clear selection");

      Array.from(this.getSelectedEntries()).forEach((el) =>
        el.classList.remove("workspace-is-selected")
      );
      this.updateSelectionWrapper();
    },
    selectAll: function () {
      console.log("selectAll");
      let e: HTMLCollectionOf<Element> = this.getEntries();
      let s: HTMLCollectionOf<Element> = this.getSelectedEntries();
      if (e.length != s.length) {
        Array.from(e).forEach((el) =>
          el.classList.add("workspace-is-selected")
        );
      } else {
        Array.from(e).forEach((el) =>
          el.classList.toggle("workspace-is-selected")
        );
      }
      this.updateSelectionWrapper();
    },
    getNodes() {
      return this.$props.model?.entries;
    },
    panHappen: function (p: any, id: String) {
      p.setTransformOrigin(null);
      this.panZoomInstance = p;
      p.set;
      p.on("panzoompan", function (e: any) {
        console.log(e);
      });
      p.on("onDoubleClick", function (e: any) {
        return false;
      });
    },
    getSelectionRectangle: function (): Element {
      return this.$el.querySelectorAll(".rectangle-selection")[0];
    },
    getSelectionWrapper: function (): Element {
      return this.$el.querySelectorAll(".rectangle-selection-wrapper")[0];
    },
    getSelectedEntries: function (): HTMLCollectionOf<Element> {
      return this.$el.querySelectorAll(".workspace-is-selected");
    },
    getEntries: function (): HTMLCollectionOf<Element> {
      return this.$el.querySelectorAll(".ws-entry");
    },
    getCoordinatesFromElement(e: any) {
      let results: string = e.style.transform;
      results = results
        .replace("translate3d(", "")
        .replace(")", "")
        .replaceAll("px", "")
        .replaceAll(" ", "");
      let values: number[] = results.split(",").map(Number);
      let w: number = parseInt(e.offsetWidth),
        h: number = parseInt(e.offsetHeight);
      return {
        x: Math.round(values[0]),
        y: Math.round(values[1]),
        w: Math.round(w),
        h: Math.round(h),
        x2: Math.round(values[0] + w),
        y2: Math.round(values[1] + h),
      };
    },
    dragMouseDown: function (e: MouseEvent) {
      this.mouseDownB = e.ctrlKey;

      if (e.ctrlKey) {
        this.dragMoveRel = { x: e.clientX, y: e.clientY };

        this.dragSelection = Array.from(this.getSelectedEntries());

        WSUtils.Events.dragStarting(this.dragSelection, this);

        this.dragSelection.push(this.getSelectionWrapper());
      } else {
        this.dragStart = this.getPositionInWorkspace(e);

        let selectionRectangle: any = this.getSelectionRectangle();
        selectionRectangle.style.visibility = "visible";
        selectionRectangle.style.transform = `translate3d(${this.dragStart.x}px, ${this.dragStart.y}px,0px)`;
        selectionRectangle.style.width = "0px";
        selectionRectangle.style.height = "0px";
      }

      if (
        e.target != undefined &&
        (<any>e.target).classList.contains("draggable")
      ) {
        console.log(e.target);

        // Invoke startDrag by passing it the target element as "this":
        // startDrag.call(evt.target, evt);
      }
      if (this.mouseDownB) {
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
    },
    updateSelectionWrapper() {
      let selectionRectangle: any = this.getSelectionWrapper();

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

      selectionRectangle.style.visibility =
        this.getSelectedEntries().length > 0 ? "visible" : "hidden";
    },
    dragMouseMove: function (e: MouseEvent) {
      let comp = this;

      this.mousePositionLast = comp.getPositionInWorkspace(e);

      function updateSelectionDrag() {
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
      }

      let selectionRectangle: any = comp.getSelectionRectangle();

      function updateSelectionRectangle() {
        let w = -1 * (comp.dragStart.x - comp.getPositionInWorkspace(e).x);
        let h = -1 * (comp.dragStart.y - comp.getPositionInWorkspace(e).y);

        let rectX = w < 0 ? comp.dragStart.x + w : comp.dragStart.x;
        let rectY = h < 0 ? comp.dragStart.x + h : comp.dragStart.y;

        selectionRectangle.style.transform = `translate3d(${rectX}px, ${rectY}px,0px)`;
        selectionRectangle.style.width = Math.abs(w) + "px";
        selectionRectangle.style.height = Math.abs(h) + "px";
      }

      if (this.mouseDownB) {
        if (e.ctrlKey) {
          updateSelectionDrag();
        }
      } else {
        if (selectionRectangle.style.visibility === "visible") {
          this.isSelectionEvent = true;
          updateSelectionRectangle();
        }
      }
    },
    dragMouseUp: function (e: MouseEvent) {
      console.log("dragMouseUp");
      let selectionRectangle: any = this.getSelectionRectangle();

      if (this.mouseDownB) {
        /**
         * Selection drag
         */
      } else if (selectionRectangle.style.visibility === "visible") {
        /**
         * Selection rectangle
         */

        let coordRect = this.getCoordinatesFromElement(selectionRectangle);
        let comp = this;

        this.clearSelection();
        Array.from(this.getEntries()).forEach((el) => {
          let coordEntry = comp.getCoordinatesFromElement(el);

          if (WSUtils.intersectRect(coordEntry, coordRect)) {
            el.classList.add("workspace-is-selected");
          }
        });

        this.updateSelectionWrapper();

        selectionRectangle.style.visibility = "hidden";
      }

      this.mouseDownB = false;
    },

    onPanStart(e: any) {
      this.$el.style.backgroundColor = switcher
        ? "rgb(50, 50, 50)"
        : "rgb(50, 50, 51)";
      switcher = !switcher;
      // hide nodes die nicht visible sind
    },
    beforeWheelHandler(e: any) {
      var shouldIgnore: boolean = !e.altKey;
      return shouldIgnore;
    },
    beforeMouseDownHandler(e: any) {
      var shouldIgnore: boolean = !e.altKey;
      return shouldIgnore;
    },
  },
});

var switcher = false;
</script>



<!-- Add "scoped" attribute to limit CSS to this component only -->
<style   lang="scss">
.wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: rgb(53, 53, 53);
  outline: none;
}

.workspace-is-selected {
  /* offset-x | offset-y | blur-radius | spread-radius | color */
  // box-shadow: 0px 0px 0px 6px #f81fc2;
  // background-color: #f81fc252;
  // resize: both;
}

.rectangle-selection {
  position: absolute;
  width: 0px;
  height: 0px;
  transform: translate3d(0px, 0px, 0px);
  background-color: rgba(57, 215, 255, 0.284);
  z-index: 1000;
}
.ws-entry{
  z-index: 100;
}
.rectangle-selection-wrapper {
  position: absolute;
  width: 0px;
  height: 0px;
  transform: translate3d(0px, 0px, 0px);
  background-color: rgba(140, 228, 250, 0.452);
  border: 2px solid  rgba(57, 215, 255, 0.76);
  z-index: 10;
  padding: 10px;
  margin: -10px;
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
