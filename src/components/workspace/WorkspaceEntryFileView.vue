<template>
  <div
    ref="el"
    class="ws-entry-file-wrapper sizefixed"
    :style="{
      transform: 'translate3d(' + getX() + 'px, ' + getY() + 'px' + ', 0)',
    }"
  >
    <input
      @keydown.stop.prevent
      @keyup.stop.prevent
      @keypress.stop.prevent 
      type="text"
      v-model="entry.displayname"
      class="wsentry-displayname ws-entry-zoom-fixed"
      placeholder="Name..."
    />
    <div class="ws-entry-file-symbol"></div>
    <p class="ws-entry-file-name">{{ entry.name }}</p>
  </div>
</template>

<script lang="ts">
/*
   @mousedown.left.ctrl.capture.prevent.stop.exact="entrySelectedLocal('flip')"
    @mousedown.left.capture.prevent.stop.exact="entrySelectedLocal('single')"
 @click.stop
    v-on:dblclick="doubleClick"
*/
const { shell } = require("electron"); // deconstructing assignment

import { defineComponent } from "vue";
import { WorkspaceEntryFile } from "../../store/model/Workspace";
import { setupEntry } from "./WorkspaceUtils";
export default defineComponent({
  name: "wsentryfile",
  data() {
    return {};
  },
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: WorkspaceEntryFile,
    viewKey: Number,
  },
  mounted() {
    this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
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
    clickStart(e: MouseEvent) {
      // this.$store.dispatch("setIsSelected", {
      //   name: this.file.key,
      //   add: e.ctrlKey,
      //   viewKey: this.viewKey,
      // });
    },

    getX() {
      // return (
      //   this.file.x - (this.file.isSelected ? this.$store.state.dragOffsetX : 0)
      // );
    },
    getY() {
      // return (
      //   this.file.y - (this.file.isSelected ? this.$store.state.dragOffsetY : 0)
      // );
    },
  },
  computed: {},
  created() {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.workspace-is-selected {
  // border: 0px solid #f81fc2f8;
  // box-sizing: border-box;
  // background-color: #f81fc252;
  // mix-blend-mode: luminosity;
}

.ws-entry-file-wrapper {
   z-index: 100;
  backface-visibility: hidden;
  will-change: transform;
  position: absolute;
  color: #f1f1f1;
  padding: 10px;
  width: 220px;
  height: 180px;

  // border: 2px solid #ffffffce;
  box-sizing: border-box;

  p {
    width: 200px;
    word-wrap: break-word;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ws-entry-file-symbol {
    height: 100px;
    width: 100px;
    display: block;
    background-color: #f1f1f1;
    border: 1px solid #15141a;
    clear: both;
    color: rgba(61, 61, 61, 0.911);

    margin: 0 auto;
  }
}
</style>
