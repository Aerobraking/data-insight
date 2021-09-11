<template>
  <div
    @dblclick.capture.stop="doubleClick"
    @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip', $event)"
    @mousedown.left.stop.exact="entrySelectedLocal('single', $event)"
    ref="el"
    class="ws-entry-file-wrapper select-element sizefixed"
    :style="{
      transform: 'translate3d(' + getX() + 'px, ' + getY() + 'px' + ', 0)',
    }"
  >
    <wsentrydisplayname :entry="entry" />

    <div class="file-symbol"></div>
    <p>{{ entry.name }}</p>
  </div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment

import { defineComponent } from "vue";
import { WorkspaceEntryFile } from "../../store/model/Workspace";
import { setupEntry } from "./WorkspaceUtils";
import * as icons from "./../../utils/IconHandler";
import wsentrydisplayname from "./WorkspaceEntryDisplayName.vue";

export default defineComponent({
  name: "wsentryfile",
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

      c.getElementsByClassName("file-symbol")[0].style.backgroundImage =
        "url('" + img.src + "')";
    });
  },
  inject: [
    "entrySelected",
    "entrySelected",
    //   "startDrag", "startDrag ",
  ],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "flip", event: MouseEvent) {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
      if (type == "single") {
        // @ts-ignore: Unreachable code error
        //   this.startDrag(event);
      }
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
  position: absolute;
  color: #f1f1f1;
  padding: 10px;
  width: 220px;
  height: 180px;
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
    text-align: center;
  }

  .file-symbol {
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
