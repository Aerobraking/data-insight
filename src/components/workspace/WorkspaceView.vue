
<template>
  <div
    @keypress.capture.ctrl.stop="keyDownCtrl"
    @mouseup.capture.ctrl="dragMouseUp"
    @mousedown.capture.ctrl="dragMouseDown"
    @mousemove.capture.ctrl.exact="dragMouseMove"
    @dragover="dragover"
    @dragleave="dragleave"
    @drop="drop"
    class="wrapper workspace"
  >
    <!-- Ohne selector hat es nicht funktioniert, weil er dann passendes dom element findet -->
    <panZoom
      @init="panHappen"
      @pan="onPanStart"
      @click.capture.exact="mouseDown"
      :options="{
        minZoom: 0.08,
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
      <div class="zoomable zoomPanel">
        <wsentries :viewId="model.id" :model="model"></wsentries>
      </div>
    </panZoom>
  </div>
</template>


<script lang="ts">
import { Workspace, WorkspaceEntryFile } from "@/store/model/DataModel";
import { MutationTypes } from "@/store/mutations/mutation-types";
import { defineComponent } from "vue";
import wsentries from "./WorkspaceEntries.vue";
// import * as d3 from "d3";
var counter = 0;
// const test = d3.easeCubicInOut;
var timesPerSecond = 30; // how many times to fire the event per second
var wait = false;

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
    dragTempOffsetX: number;
    dragTempOffsetY: number;
    mouseDownB: boolean;
    panZoomInstance: any;
  } {
    return {
      dragStartX: 0,
      dragStartY: 0,
      dragTempOffsetX: 0,
      dragTempOffsetY: 0,
      mouseDownB: false,
      panZoomInstance: null,
    };
  },

  computed: {},
  methods: {
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

      let listFiles: Array<WorkspaceEntryFile> = [];

      e.dataTransfer.files.forEach((f: any) => {
        listFiles.push(new WorkspaceEntryFile(f.path));
      });

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

      var payload = {
        model: <Workspace>this.model,
        listFiles,
      };

      var offset = 0;
      for (const e of listFiles) {
        e.x = x + offset;
        e.y = y;
        offset += 250;
      }

      this.$store.commit(MutationTypes.ADD_FILES, payload);
    },
    mouseDown: function (e: MouseEvent) {
      console.log("mouseDown");
      //   this.$store.dispatch("clearSelection", {
      //     viewKey: this.workspace.key,
      //   });
    },
    getNodes() {
      return this.$props.model?.entries;
    },
    panHappen: function (p: any, id: String) {
      p.setTransformOrigin(null);
      this.panZoomInstance = p;
      p.on("panzoompan", function (e: any) {
        console.log(e);
      });
      p.on("onDoubleClick", function (e: any) {
        return false;
      });
    },
    keyDownCtrl: function (e: KeyboardEvent) {
      let cmd = e.code.toLowerCase();
      //   if (cmd === "keya" || cmd === "keyd") {
      //     this.$store.dispatch("selectAll", {
      //       viewKey: this.workspace.key,
      //     });
      //     e.preventDefault();
      //   }
      //   if (cmd === "keye") {
      //     console.log("undo button");

      //     this.$store.dispatch("undoView", {
      //       viewKey: this.workspace.key,
      //     });
      //   }
    },
    dragMouseMove: function (e: MouseEvent) {
      if (!this.mouseDownB) {
        return;
      }

      var xOffT = this.dragStartX - e.clientX;
      var yOffT = this.dragStartY - e.clientY;

      xOffT /= this.panZoomInstance.getTransform().scale;
      yOffT /= this.panZoomInstance.getTransform().scale;

      // console.log("check: "+xOffT+" - "+ yOffT);
      //   if (Math.abs(xOffT) >= 1 || Math.abs(yOffT) >= 1) {
      //     this.$store.commit("moveSelectedOffset", {
      //       xOff: xOffT,
      //       yOff: yOffT,
      //       viewKey: this.workspace.key,
      //       undoAction: false,
      //     });
      //   }

      // if (!wait) {
      //   // fire the event

      //   // stop any further events
      //   wait = true;
      //   // after a fraction of a second, allow events again
      //   setTimeout(function () {
      //     wait = false;
      //   }, 1000 / timesPerSecond);
      // }
    },
    dragMouseUp: function (e: MouseEvent) {
      this.mouseDownB = false;

      var xOffT = this.dragStartX - e.clientX;
      var yOffT = this.dragStartY - e.clientY;

      xOffT /= this.panZoomInstance.getTransform().scale;
      yOffT /= this.panZoomInstance.getTransform().scale;

      // console.log("check: "+xOffT+" - "+ yOffT);
      //   if (Math.abs(xOffT) >= 1 || Math.abs(yOffT) >= 1) {
      //     this.$store.dispatch("moveSelectedOffset", {
      //       xOff: xOffT,
      //       yOff: yOffT,
      //       viewKey: this.workspace.key,
      //       undoAction: true,
      //     });
      //   }
    },
    dragMouseDown: function (e: MouseEvent) {
      this.mouseDownB = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
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
.zoomPanel {
  width: 800px;
  height: 800px;
  left: 300px;
  top: 300px;
  outline: none;
}

.wrapper {
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: rgb(53, 53, 53);
  outline: none;
}
.vue-pan-zoom-item {
  height: 100%;
  outline: none;
}

.vue-pan-zoom-scene {
  height: 100%;
  overflow: hidden;
  outline: none;
}
</style>
