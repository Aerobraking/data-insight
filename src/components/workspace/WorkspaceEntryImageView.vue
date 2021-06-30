<template>
  <div
    @mousedown.ctrl.capture.prevent.stop.exact="entrySelectedLocal('flip')"
    @mousedown.capture.prevent.stop.exact="entrySelectedLocal('single')"
    @click.stop
    v-on:dblclick="doubleClick"
    class="ws-entry ws-entry-image-wrapper"
  ></div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment

import { defineComponent } from "vue";
import { WorkspaceEntryImage } from "../../store/model/DataModel";
export default defineComponent({
  name: "wsentryimage",
  data() {
    return {};
  },
  props: {
    entry: WorkspaceEntryImage,
    viewKey: Number,
  },
  mounted() {
    this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
    let comp = this;
    let path = this.entry?.getURL();
    this.$el.style.backgroundImage = "url('" + this.entry?.getURL() + "')";
    if (this.entry != undefined) {
      var img = new Image();
      img.onload = function () {
        let w = img.width;
        let h = img.height;
        let scale = w / 600;
        w /= scale;
        h /= scale;
        comp.$el.style.width = w + "px";
        comp.$el.style.height = h + "px";
      };
      img.src = this.entry.path;
    }
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "flip") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
    },
    doubleClick(e: MouseEvent) {
      e.preventDefault();

      //shell.showItemInFolder('filepath') // Show the given file in a file manager. If possible, select the file.
      if (this.$props.entry?.path != undefined) {
        shell.openPath(this.$props.entry?.path); // Open the given file in the desktop's default manner.
      }
    },
    clickStart(e: MouseEvent) {},
  },
  computed: {},
  created() {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.workspace-is-selected {
  /* offset-x | offset-y | blur-radius | spread-radius | color */
  box-shadow: 0px 0px 0px 6px #f81fc2;
  background-color: #f81fc252;
}

.ws-entry-image-wrapper {
  backface-visibility: hidden;
  will-change: transform;
  position: absolute;
  color: #f1f1f1;
  padding: 10px;
  width: 220px;
  height: 180px;
  background-size: cover;
  box-sizing: border-box;
}
</style>
