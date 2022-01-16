<template>
  <div
    ref="el"
    class="ws-entry-video-wrapper"
    @dblclick.capture.stop="doubleClick"
    @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
    @mousedown.left.stop.exact="entrySelectedLocal('single')"
  >
    <slot></slot>
    <wsentryalert :entry="entry" />

    <!-- <div
      @dblclick.capture.stop="doubleClick"
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      class="video-selector select-element"
    > -->
    <div class="video-canvas">
      <video @click.stop.prevent src=""></video>
    </div>
    <!-- </div>  -->
  </div>
</template>

<script lang="ts">
import * as watcher from "../../utils/WatchSystemMain";
import { defineComponent } from "vue"; 
import { setupEntry } from "../app/WorkspaceUtils";
import wsentryalert from "../app/WorkspaceEntryAlert.vue";
import { WorkspaceEntryVideo } from "@/store/model/implementations/filesystem/FileSystemWorkspaceEntries";
export default defineComponent({
  name: "wsentryvideo",
  components: {
    wsentryalert,
  },
  data(): {
    cacheListener: any;
  } {
    return {
      cacheListener: undefined,
    };
  },
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: {
      type: WorkspaceEntryVideo,
      required: true,
    },
    viewKey: Number,
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
  inject: ["entrySelected", "entrySelected"],
  methods: {
    cacheSizeEvent(w: number, h: number): void {
      if (!this.entry.created) {
        let wEntry: number = Number(this.$el.offsetWidth);
        this.$el.style.width = wEntry + "px";
        this.$el.style.height = wEntry * (h / w) + "px";
        this.entry.created = true;
      }
    },

    entrySelectedLocal(type: "add" | "single" | "toggle") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
    },
    doubleClick(e: MouseEvent) {
      this.$emit("zoomed");
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
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
  // images are behind the normal stuff to use them as a background
  z-index: 50;
  padding: 0px;
  width: 220px;
  height: 180px;
  cursor: pointer;
}
</style>
