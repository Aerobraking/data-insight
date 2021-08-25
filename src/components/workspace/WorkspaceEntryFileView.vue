<template>
  <div
    @mousedown.left.ctrl.capture.prevent.stop.exact="entrySelectedLocal('flip')"
    @mousedown.left.capture.prevent.stop.exact="entrySelectedLocal('single')"
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
      placeholder=""
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
import * as icons from "./../../utils/IconHandler";
export default defineComponent({
  name: "wsentryfile",
  data() {
    return {};
  },
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: {
      type: WorkspaceEntryFile,
      required: true,
    },
    viewKey: Number,
  },
  mounted() {
    let c: any = this.$el;
    // this.$el.style.transform = `translate3d(${this.$props.entry.x}px, ${this.$props.entry.y}px,0px)`;
 

    icons.IconHandler.registerPath(this.entry.path, (url: string) => {
      var img = new Image();

      img.src = url;

      c.getElementsByClassName(
        "ws-entry-file-symbol"
      )[0].style.backgroundImage = "url('" + img.src + "')";
    });
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

      shell.openPath(this.$props.entry.path); // Open the given file in the desktop's default manner.
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
.ws-entry-file-wrapper {
  z-index: 100;
  // will-change: transform;
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
    padding: 0;
    margin: 0;
    margin-top: 6px;
    color: rgb(231, 231, 231);
  }

  .ws-entry-file-symbol {
    height: 70px;
    width: 70px;
    display: block;
    background-size: cover;
    background-color: #f1f1f100;
    border: none;
    clear: both;
    border: none;
    margin: 0 auto;
  }
}
</style>
