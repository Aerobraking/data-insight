
<template>
  <div
    v-on:keyup="keymonitor"
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
      @init="panHappen"
      @pan="onPanStart"
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
        <keep-alive>
          <wsentries :viewId="model.id" :model="model"></wsentries>
        </keep-alive>
      </div>
    </panZoom>
  </div>
</template>


<script lang="ts">
import {
  Workspace,
  WorkspaceEntry,
  WorkspaceEntryFile,
  WorkspaceEntryFolderWindow,
  WorkspaceEntryImage,
} from "@/store/model/DataModel";
import { MutationTypes } from "@/store/mutations/mutation-types";
import { defineComponent } from "vue";
import wsentries from "./WorkspaceEntries.vue";
// import * as d3 from "d3";
var counter = 0;
// const test = d3.easeCubicInOut;
var timesPerSecond = 30; // how many times to fire the event per second
var wait = false;
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
    dragStartX: number;
    dragStartY: number;
    dragMoveRelX: number;
    dragMoveRelY: number;
    dragTempOffsetX: number;
    dragTempOffsetY: number;
    mouseDownB: boolean;
    isSelectionEvent: boolean;
    panZoomInstance: any;
  } {
    return {
      dragMoveRelX: 0,
      dragMoveRelY: 0,
      dragStartX: 0,
      dragStartY: 0,
      dragTempOffsetX: 0,
      dragTempOffsetY: 0,
      mouseDownB: false,
      isSelectionEvent: false,
      panZoomInstance: null,
    };
  },

  computed: {},
  provide() {
    return {
      entrySelected: this.entrySelected,
    };
  },
  methods: {
    keymonitor(e: KeyboardEvent) {
      switch (e.key) {
        case "a":
          //  if (e.ctrlKey) {
          console.log(e);
          this.selectAll();
          // }

          break;

        default:
          break;
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
          if (f.path.endsWith("jpg") || f.path.endsWith("jpeg")) {
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

      var offset = 0;
      for (const e of listFiles) {
        e.x = x + offset;
        e.y = y;
        offset += e.width + 20;
      }

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
    dragMouseMove: function (e: MouseEvent) {
      let comp = this;

      function updateSelectionDrag() {
        var xOffT = comp.dragMoveRelX - e.clientX;
        var yOffT = comp.dragMoveRelY - e.clientY;

        xOffT /= comp.panZoomInstance.getTransform().scale;
        yOffT /= comp.panZoomInstance.getTransform().scale;

        comp.dragMoveRelX = e.clientX;
        comp.dragMoveRelY = e.clientY;

        let objToDrag = comp.getSelectedEntries();

        for (let index = 0; index < objToDrag.length; index++) {
          const e: any = objToDrag[index];
          let coord = comp.getCoordinatesFromElement(e);
          e.style.transform = `translate3d(${coord.x - xOffT}px, ${
            coord.y - yOffT
          }px,0px)`;
        }
      }

      let selectionRectangle: any = comp.getSelectionRectangle();

      function updateSelectionRectangle() {
        let w = -1 * (comp.dragStartX - comp.getPositionInWorkspace(e).x);
        let h = -1 * (comp.dragStartY - comp.getPositionInWorkspace(e).y);

        let rectX = w < 0 ? comp.dragStartX + w : comp.dragStartX;
        let rectY = h < 0 ? comp.dragStartY + h : comp.dragStartY;

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

          function intersectRect(
            r1: { x: number; y: number; x2: number; y2: number },
            r2: { x: number; y: number; x2: number; y2: number }
          ) {

            let a:boolean =    r2.x > r1.x2 ;
            let b:boolean =      r2.x2 < r1.x;
            let c:boolean =   r2.y > r1.y2  ;
            let d:boolean =    r2.y2 < r1.y;

            return !(
              r2.x > r1.x2 ||
              r2.x2 < r1.x ||
              r2.y > r1.y2 ||
              r2.y2 < r1.y
            );
          }

          if (intersectRect(coordEntry, coordRect)) {
            el.classList.add("workspace-is-selected");
          }
        });

        selectionRectangle.style.visibility = "hidden";
      }

      this.mouseDownB = false;
    },
    dragMouseDown: function (e: MouseEvent) {
      this.mouseDownB = e.ctrlKey;

      if (e.ctrlKey) {
        this.dragMoveRelX = e.clientX;
        this.dragMoveRelY = e.clientY;
      } else {
        this.dragStartX = this.getPositionInWorkspace(e).x;
        this.dragStartY = this.getPositionInWorkspace(e).y;

        let selectionRectangle: any = this.getSelectionRectangle();
        selectionRectangle.style.visibility = "visible";
        selectionRectangle.style.transform = `translate3d(${this.dragStartX}px, ${this.dragStartY}px,0px)`;
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
    onPanStart(e: any) {
      this.$store.state;
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
</script>



<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: rgb(53, 53, 53);
  outline: none;
}

.rectangle-selection {
  position: absolute;
  width: 0px;
  height: 0px;
  transform: translate3d(0px, 0px, 0px);
  background-color: rgba(57, 215, 255, 0.284);
  z-index: 1000;
}

.vue-pan-zoom-scene {
  outline: none;
  width: 100%;
  height: 100%;
  position: fixed;
  padding: 0;
  margin: 0;
}
</style>
