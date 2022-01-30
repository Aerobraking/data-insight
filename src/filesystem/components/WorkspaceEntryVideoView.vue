<template>
  <div
    ref="el"
    class="ws-entry-video-wrapper"
    @dblclick.capture.stop="doubleClick"
    @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
    @mousedown.left.stop.exact="entrySelectedLocal('single')"
  >
    <div class="video-canvas">
      <video @click.stop.prevent src=""></video>
    </div>
  </div>
</template>

<script lang="ts">
import WorkspaceViewIfcWrapper from "@/core/components/workspace/WorkspaceViewIfcWrapper";
import { defineComponent } from "vue";
import { WorkspaceEntryVideo } from "../model/FileSystemWorkspaceEntries";
export default defineComponent({
  name: "wsentryvideo",
  data(): {
    cacheListener: any;
  } {
    return {
      cacheListener: undefined,
    };
  },
  props: {
    entry: {
      type: WorkspaceEntryVideo,
      required: true,
    },
    workspace: {
      type: WorkspaceViewIfcWrapper,
      required: true,
    },
  },
  mounted() {
    let _this = this;
    let path = this.entry.path;

    var v: HTMLVideoElement = this.$el.getElementsByTagName(
      "video"
    )[0] as HTMLVideoElement;
    v.addEventListener(
      "loadedmetadata",
      function (e) {
        _this.cacheSizeEvent(this.videoWidth, this.videoHeight);
      },
      false
    );
    v.loop = true;
    v.setAttribute("src", path);
    v.load();
    v.setAttribute("controls", "controls");
    v.setAttribute("style", "width:100%; height:100%;");
  },
  unmounted() {},
  inject: ["entrySelected"],
  methods: {
    cacheSizeEvent(w: number, h: number): void {
      if (!this.entry.created) {
        let wEntry: number = Number(this.$el.parentElement.offsetWidth);
        this.$el.parentElement.style.width = wEntry + "px";
        this.$el.parentElement.style.height = wEntry * (h / w) + "px";
        this.entry.created = true;
        this.entry.aspectratio = { width: w, height: h, ratio: h / w };
        this.workspace.updateUI();
      }
    },

    entrySelectedLocal(type: "add" | "single" | "toggle") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.entry.id, type);
    },
    doubleClick(e: MouseEvent) {
      this.$emit("zoomed");
    },
  },
});
</script>

<style scoped lang="scss">
.video-canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
}

.ws-entry-video-wrapper {
  z-index: 50;
  padding: 0px;
  background: black;
  cursor: pointer;
}
</style>
