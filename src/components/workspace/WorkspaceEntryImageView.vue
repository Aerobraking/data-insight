<template>
  <div ref="el" class="ws-entry-image-wrapper">
    <wsentrydisplayname :entry="entry" />
    <div
      @dblclick.capture.stop="doubleClick"
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      class="image-selector select-element"
    ></div>
  </div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment

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
    let comp = this;
    let path = this.entry?.getURL();

    if (this.entry.isClipboard) {
      console.log("create clipboard background image");

      comp.$el.style.backgroundImage = "url( " + this.entry.path + ")";
    } else {
      cache.ImageCache.registerPath(path, {
        callback: (url: string, type: "small" | "medium" | "original") => {
          if (type == "medium") {
            comp.$el.style.backgroundImage = url;
          }
        },
        callbackSize: (dim: cache.ImageDim) => {
          if (!comp.entry.imageCreated) {
            let w: number = Number(comp.$el.offsetWidth);
            comp.$el.style.width = w + "px";
            comp.$el.style.height = w * dim.ratio + "px";
            comp.entry.imageCreated = true;
          }
        },
      });
    }
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "flip") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
    },
    doubleClick(e: MouseEvent) {
      console.log();

      //shell.showItemInFolder('filepath') // Show the given file in a file manager. If possible, select the file.

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

.ws-entry-image-wrapper {
  // images are behind the normal stuff to use them as a background
  z-index: 50;
  // border: 1px solid #aaa;
  // background: rgb(120, 120, 120);
  position: absolute;
  color: #f1f1f1;
  padding: 0px;
  width: 220px;
  height: 180px;
  background-size: cover;
  box-sizing: border-box;

  img {
    width: 100%;
    height: 100%;
    position: absolute;
  }
}
</style>
