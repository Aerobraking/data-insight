<template>
  <div
    ref="el"
    class="ws-entry-image-wrapper"
    @dblclick.capture.stop="doubleClick"
    @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('toggle')"
    @mousedown.left.stop.exact="entrySelectedLocal('single')"
  >
    <div class="image-canvas"></div>
  </div>
</template>

<script lang="ts">
import * as cache from "../utils/ImageCache";
import { FSWatcherConnectorInstance } from "../utils/FileSystemWatcherConnector";
import { defineComponent } from "vue";
import { WorkspaceEntryImage } from "../model/FileSystemWorkspaceEntries";
import WorkspaceViewIfcWrapper from "@/core/utils/WorkspaceViewIfcWrapper";
import { WSZoomEvent } from "@/core/utils/WorkspaceViewEvents";
export default defineComponent({
  name: "wsentryimage",
  data(): {
    cacheListener: any;
  } {
    return {
      cacheListener: undefined,
    };
  },
  props: {
    entry: {
      type: WorkspaceEntryImage,
      required: true,
    },
    workspace: {
      type: WorkspaceViewIfcWrapper,
      required: true,
    },
  },
  mounted() {
    let _this = this;
    let path = this.entry.getURL();
    const div = _this.$el.getElementsByClassName("image-canvas")[0];

    // prevents a bug that new instances of the components contain the style of previous instances
    div.style.background = "";
    this.$el.style.background = "";
    this.$el.parentElement.style.background = "";

    // if (this.entry.isClipboard) {
    //   _this.$el.style.backgroundImage = "url( " + this.entry.path + ")";
    // } else {
    if (this.entry.previewBase64) {
      var img = new Image();
      img.src = this.entry.previewBase64;
      _this.$el.style.backgroundImage = "url('" + img.src + "')";
    }

    this.cacheListener = {
      callback: this.cacheImageEvent,
      callbackSize: this.cacheSizeEvent,
    };

    FSWatcherConnectorInstance.registerPath(this.entry.path, this.watcherEvent);
    cache.ImageCache.registerPath(path, this.cacheListener);
    // }
  },
  unmounted() {
    //  cache.ImageCache.unregisterPath(path) ;
  },
  inject: ["entrySelected"],
  methods: {
    cacheSizeEvent(dim: cache.ImageDim): void {
      if (!this.entry.imageCreated) {
        let w: number = Number(this.$el.parentElement.offsetWidth);
        this.$el.parentElement.style.width = w + "px";
        this.$el.parentElement.style.height = w * dim.ratio + "px";
        this.entry.imageCreated = true;
        this.entry.aspectratio = dim;
        this.workspace.updateUI();
      }
    },
    cacheImageEvent(url: string, type: cache.ImageSize): void {
      switch (type) {
        case cache.ImageSize.error:
          this.entry.alert = "Image could not be loaded";
          return;
        case cache.ImageSize.finish:
          return;
        default:
          this.entry.alert = undefined;
      }

      const div = this.$el.getElementsByClassName("image-canvas")[0];
      if (type == cache.ImageSize.preview) {
        this.entry.previewBase64 = url;
      }
      if (
        type == cache.ImageSize.tiny &&
        (!this.$el.style.backgroundImage ||
          this.$el.style.backgroundImage == "")
      ) {
        this.$el.style.backgroundImage = url;
      }
      if (
        // type == cache.ImageSize.small
        // ||
        type == cache.ImageSize.medium
        // ||
        // type == cache.ImageSize.original
      ) {
        // this.workspaceEvent({scale:this.workspace.getCurrentTransform().scale});
        div.style.backgroundImage = url;

        // const img = new Image();
        // img.onload = () => {
        //   this.entry.imgOriginal = img;
        //   this.entry.imgOriginalLoaded = true;
        //   this.workspace.drawCanvas();
        // };

        // img.src = url;

        if (this.$el.style.backgroundImage != "") {
          setTimeout(() => {
            this.$el.style.backgroundImage = "";
          }, 2500);
        }
      }
    },
    workspaceEvent: function (e: WSZoomEvent) {
      // let url: string | undefined;
      // const div = this.$el.getElementsByClassName("image-canvas")[0];
      // if (e.scale < 0.3) {
      //   // url = cache.ImageCache.getUrl(
      //   //   this.entry.getURL(),
      //   //   cache.ImageSize.tiny
      //   // );
      //   // } else  if (e.scale < 0.4) {
      //   //   url = cache.ImageCache.getUrl(
      //   //     this.entry.getURL(),
      //   //     cache.ImageSize.small
      //   //   );
      //   // } else if (e.scale < 10) {
      //   //   url = cache.ImageCache.getUrl(
      //   //     this.entry.getURL(),
      //   //     cache.ImageSize.medium
      //   //   );
      //   div.style.backgroundImage = "";
      // } else {
      //   url = cache.ImageCache.getUrl(
      //     this.entry.getURL(),
      //     cache.ImageSize.original
      //   );
      //   if (url) {
      //     if (div.style.backgroundImage != url) div.style.backgroundImage = url;
      //   }
      // }
    },
    watcherEvent(type: string) {
      cache.ImageCache.registerPath(
        this.entry.getURL(),
        this.cacheListener,
        true
      );
    },
    entrySelectedLocal(type: "add" | "single" | "toggle") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.entry.id, type);
    },
    doubleClick(e: MouseEvent) {
      this.$emit("zoomed");
    },
    clickStart(e: MouseEvent) {},
  },
  computed: {},
  created() {},
});
</script>

<style scoped lang="scss">
@import "@/core/components/styles/variables.scss";

.image-selector {
  width: 100%;
  height: 100%;
}

.image-canvas {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 10;
  background-size: cover;
}

.ws-entry-image-wrapper {
  // images are behind the normal stuff to use them as a background
  z-index: 50;
  background: #000;
  padding: 0px;
  background-size: cover;
}
</style>
