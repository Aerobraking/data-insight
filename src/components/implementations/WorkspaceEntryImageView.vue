<template>
  <div ref="el" class="ws-entry-image-wrapper">
    <slot></slot>
    <wsentryalert :entry="entry" />
    <div
      @dblclick.capture.stop="doubleClick"
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      class="image-selector select-element"
    >
      <div class="image-canvas"></div>
    </div>
  </div>
</template>

<script lang="ts">
import * as cache from "../../utils/ImageCache";
import * as watcher from "../../utils/WatchSystem";
import { defineComponent } from "vue";
import { WorkspaceEntryImage } from "../../store/model/implementations/filesystem/FileSystemWorkspaceEntries";
import { setupEntry } from "../app/WorkspaceUtils";
import wsentryalert from "../app/WorkspaceEntryAlert.vue";
export default defineComponent({
  name: "wsentryimage",
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
      type: WorkspaceEntryImage,
      required: true,
    },
    viewKey: Number,
  },
  mounted() {
    let _this = this;
    let path = this.entry.getURL();
    const div = _this.$el.getElementsByClassName("image-canvas")[0];

    if (this.entry.isClipboard) {
      _this.$el.style.backgroundImage = "url( " + this.entry.path + ")";
    } else {
      if (this.entry.previewBase64) {
        var img = new Image();
        img.src = this.entry.previewBase64;
        _this.$el.style.backgroundImage = "url('" + img.src + "')";
      }

      this.cacheListener = {
        callback: this.cacheImageEvent,
        callbackSize: this.cacheSizeEvent,
      };

      watcher.FileSystemWatcher.registerPath(
        this.entry.path,
        this.watcherEvent
      );
      // _this.$el.classList.toggle("gradient-border", true);
      cache.ImageCache.registerPath(path, this.cacheListener);
      // }, 33);
    }
  },
  unmounted() {
    //  cache.ImageCache.unregisterPath(path) ;
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    cacheSizeEvent(dim: cache.ImageDim): void {
      if (!this.entry.imageCreated) {
        let w: number = Number(this.$el.offsetWidth);
        this.$el.style.width = w + "px";
        this.$el.style.height = w * dim.ratio + "px";
        this.entry.imageCreated = true;
      }
    },
    cacheImageEvent(url: string, type: cache.ImageSize): void {
      console.log("cacheImageEvent", url, type);

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
      if (type == cache.ImageSize.medium) {
        div.style.backgroundImage = url;
        if (this.$el.style.backgroundImage != "") {
          setTimeout(() => {
            this.$el.style.backgroundImage = "";
          }, 500);
        }

        this.$el.classList.toggle("gradient-border", false);
      }
    },
    watcherEvent(type: string) {
      console.log("watcherEvent", type);
      cache.ImageCache.registerPath(
        this.entry.getURL(),
        this.cacheListener,
        true
      );
    },
    entrySelectedLocal(type: "add" | "single" | "flip") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
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

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.image-selector {
  width: 100%;
  height: 100%;
}
.image-canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background-size: cover;
  box-sizing: border-box;
}

.ws-entry-image-wrapper {
  // images are behind the normal stuff to use them as a background
  z-index: 50;
  background: transparent;
  position: absolute;
  color: #f1f1f1;
  padding: 0px;
  width: 220px;
  height: 180px;
  background-size: cover;
  box-sizing: border-box;
}
.loading-border {
}

@keyframes rotate {
  100% {
    transform: rotate(1turn);
  }
}
$color-Selection: rgba(57, 215, 255, 0.3);

.gradient-border {
  border-radius: 2px;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    z-index: -2;
    left: -50%;
    top: -50%;
    width: 200%;
    height: 200%;
    background-color: $color-Selection;
    background-repeat: no-repeat;
    background-size: 50% 50%, 50% 50%;
    background-position: 0 0, 100% 0, 100% 100%, 0 100%;
    background-image: //
      linear-gradient($color-Selection, $color-Selection),
      //
      linear-gradient($color-Selection, $color-Selection),
      //
      linear-gradient(#377af5, #377af5),
      //
      linear-gradient(#377af5, #377af5);
    animation: rotate 4s linear infinite;
  }

  &::after {
    content: "";
    position: absolute;
    z-index: -1;
    left: 12px;
    top: 12px;
    width: calc(100% - 24px);
    height: calc(100% - 24px);
    background: white;
    border-radius: 2px;
  }
}
</style>
