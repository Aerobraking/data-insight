<template>
  <div
    v-on:dblclick.stop.prevent=""
    class="ws-folder-window-wrapper draggable"
    v-bind:class="['mydiv, selectable', { selected: entry.isSelected }]"
  >
    <div
      @click.capture.exact="selectEntry"
      class="ws-folder-window-bar-top"
    ></div>
    <div class="form-group mt-4 mb-2">
      <input v-model="searchstring" class="" placeholder="Search ..." />
    </div>
    <table>
      <tbody>
        <tr class="clickable" v-on:dblclick.stop.prevent="folderBack()">
          <td class="icon-row"></td>
          <td>... {{ parentDir }}</td>
          <td></td>
        </tr>
        <tr
          v-for="file in getFileList"
          :key="file.filename"
          v-on:dblclick.stop.prevent="folderOpen(file)"
        >
          <td></td>
          <td>{{ file.filename }}</td>
          <td>{{ file.isDirectory }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment

const fs = require("fs");
const path = require("path");
import { defineComponent } from "vue";
import {
  FolderWindowFile,
  WorkspaceEntryFolderWindow,
} from "../../store/model/DataModel";

export default defineComponent({
  name: WorkspaceEntryFolderWindow.viewid,
  data() {
    return { searchstring: "", parentDir: "" };
  },
  props: {
    entry: WorkspaceEntryFolderWindow,
    viewKey: Number,
  },
  mounted() {
    this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
  },
  methods: {
    selectEntry() {
      console.log("adawdawd");

      this.$el.classList.add("workspace-is-selected");
    },
    folderBack() {
      if (this.entry != undefined) {
        this.entry.path = path.dirname(this.entry.path);
        let l = this.entry.path.split("\\");
        this.parentDir = l[l.length - 1];
      }
    },
    folderOpen(folder: FolderWindowFile) {
      if (this.entry != undefined) {
        if (folder.isDirectory) {
          this.entry.path = folder.path;
          let l = this.entry.path.split("\\");
          this.parentDir = l[l.length - 1];
        }
      }
    },
  },
  watch: {
    firstName: function (val) {},
  },
  computed: {
    getFileList(): Array<FolderWindowFile> {
      let list: Array<FolderWindowFile> = [];
      let c = this;
      if (this.entry != undefined) {
        const dir = this.entry.path;
        fs.readdirSync(this.entry.path).forEach((file: any) => {
          const filePath = path.join(dir, file);
          const fileStat = fs.lstatSync(filePath);
          list.push(
            new FolderWindowFile(
              filePath,
              fileStat.isDirectory(),
              fileStat.isFile ? fileStat.size : 0
            )
          );
        });
      }

      list = list
        .sort((a: FolderWindowFile, b: FolderWindowFile) => {
          if (a.isDirectory === b.isDirectory) {
            return a.filename.localeCompare(b.filename);
          }
          return a.isDirectory ? -1 : 1;
        })
        .filter((f: FolderWindowFile) => {
          return c.searchstring.length < 1
            ? true
            : f.filename
                .toLowerCase()
                .includes(this.searchstring.toLowerCase());
        });

      return list;
    },
  },

  created() {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.ws-folder-window-wrapper {
  resize: both;
  overflow: auto;
  height: 600px;
  width: 600px;
  min-width: 200px;
  min-height: 200px;
  // will-change: transform;
  padding: 10px;
  position: absolute;
  color: #646464;
  background: #ffffff;
  border: #2b2b2b;
  border-width: 2px;
  border-radius: 4px;
  text-align: left;
  vertical-align: top;
}
table {
  background: #ffffff;
}

.ws-folder-window-bar-top {
  width: 100%;
  height: 25px;
  background-color: #646464;
}

.workspace-is-selected {
  border: 5px solid #661652;
}
</style>
