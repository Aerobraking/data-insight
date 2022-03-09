<template>
  <div
    @dblclick.capture.stop="doubleClick"
    @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip', $event)"
    @mousedown.left.stop.exact="entrySelectedLocal('single', $event)"
    ref="el"
    class="ws-entry-file-wrapper select-element"
  >
    <div class="file-symbol"></div>
    <p>{{ entry.name }}</p>
  </div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment

import { defineComponent } from "vue";
import * as watcher from "../utils/WatchSystemMain";
import { WorkspaceEntryFile } from "@/filesystem/model/FileSystemWorkspaceEntries";
import * as icons from "../utils/IconHandler";

export default defineComponent({
  name: "wsentryfile",
  data() {
    return {};
  }, 
  props: {
    entry: {
      type: WorkspaceEntryFile,
      required: true,
    },
  },
  mounted() {
    let _this: any = this;

    icons.IconHandler.registerPath(this.entry.path, (url: string) => {
      var img = new Image();
      img.src = url;
      _this.$el.getElementsByClassName("file-symbol")[0].style.backgroundImage =
        "url('" + img.src + "')";
    });
    watcher.FileSystemWatcher.registerPath(this.entry.path, this.watcherEvent);
  },
  inject: ["entrySelected"],
  methods: {
    watcherEvent(type: string) {
      switch (type) {
        case "unlink":
          this.entry.alert = `Folder ${this.entry.path} does not exist`;
          break;
        default:
          this.entry.alert = undefined;
      }
    },
    entrySelectedLocal(type: "add" | "single" | "toggle", event: MouseEvent) {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.entry.id, type);
    },
    doubleClick(e: MouseEvent) {
      e.preventDefault();
      shell.openPath(this.$props.entry.path); // Open the given file in the desktop's default manner.
    },
  },
  computed: {},
  created() {},
});
</script>
 
<style scoped lang="scss">
.ws-entry-file-wrapper {
  z-index: 100;
  position: absolute;
  color: #f1f1f1;
  padding: 10px;
  // width: 220px;
  // height: 180px;
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
