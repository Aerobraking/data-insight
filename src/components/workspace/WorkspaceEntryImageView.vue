<template>
  <div ref="el" class="ws-entry-image-wrapper">
    <wsentrydisplayname :entry="entry" />
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
const { shell } = require("electron");

import * as cache from "./../../utils/ImageCache";
import { defineComponent } from "vue";
import { WorkspaceEntryImage } from "../../store/model/Workspace";
import { setupEntry } from "./WorkspaceUtils";
import wsentrydisplayname from "./WorkspaceEntryDisplayName.vue";
export default defineComponent({
  name: "wsentryimage",
  data() {
    return {};
  },
  components: {
    wsentrydisplayname,
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
    let path = this.entry?.getURL();
    const div = _this.$el.getElementsByClassName("image-canvas")[0];

    if (this.entry.isClipboard) {
      _this.$el.style.backgroundImage = "url( " + this.entry.path + ")";
    } else {
      setTimeout(() => {
        if (this.entry.previewBase64) {
          var img = new Image();
          img.src = this.entry.previewBase64;
          _this.$el.style.backgroundImage = "url('" + img.src + "')";
        }
        cache.ImageCache.registerPath(path, {
          callback: (
            url: string,
            type: "preview" | "small" | "medium" | "original"
          ) => {
            if (type == "preview") {
              _this.entry.previewBase64 = url;
            }
            if (type == "medium") {
              div.style.backgroundImage = url;
              setTimeout(() => {
                _this.$el.style.backgroundImage = "";
              }, 500);
            }
          },
          callbackSize: (dim: cache.ImageDim) => {
            if (!_this.entry.imageCreated) {
              let w: number = Number(_this.$el.offsetWidth);
              _this.$el.style.width = w + "px";
              _this.$el.style.height = w * dim.ratio + "px";
              _this.entry.imageCreated = true;
            }
          },
        });
      }, 33);
    }
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "flip") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
    },
    doubleClick(e: MouseEvent) {
      shell.openPath(this.$props.entry.path); // Open the given file in the desktop's default manner.
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
  background-size: cover;
  box-sizing: border-box;
}

.ws-entry-image-wrapper {
  // images are behind the normal stuff to use them as a background
  z-index: 50;
  background: rgb(207, 207, 207);
  position: absolute;
  color: #f1f1f1;
  padding: 0px;
  width: 220px;
  height: 180px;
  background-size: cover;
  box-sizing: border-box;
}
</style>
