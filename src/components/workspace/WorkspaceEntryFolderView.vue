<template>
  <div
    ref="el"
    @click.stop
    @mousedown.stop
    @mouseup.stop
    @mousemove.stop
    v-on:dblclick.stop.prevent=""
    :class="{ opaque: opaque }"
    class="ws-folder-window-wrapper"
  >
    <input
      v-model="entry.displayname"
      class="wsentry-displayname ws-entry-zoom-fixed"
      placeholder=""
    />
    <div
      @mousedown.left.ctrl.capture.prevent.stop.exact="
        entrySelectedLocal('flip')
      "
      @mousedown.left.capture.prevent.stop.exact="entrySelectedLocal('single')"
      class="ws-folder-window-bar-top selectable-highlight"
    ></div>
    <div class="search-bar">
      <button @click="openDefault">Default</button>
      <button @click="setDefault">Set Default</button>
      <button @click="showTiles = !showTiles">View</button>
      <button @click="opaque = !opaque">Opaque</button>
      <input
        v-on:keyup.stop
        v-model="searchstring"
        class=""
        placeholder="Search ..."
      />
    </div>

    <div class="viewport">
      <div
        @wheel="scrolling"
        :class="{ opaque: opaque }"
        v-show="showTiles"
        class="tile-wrapper"
      >
        <div class="tile" v-on:dblclick.stop.prevent="folderBack()">
          <p>... {{ parentDir }}</p>
        </div>
        <keep-alive>
          <div
            class="tile"
            v-for="file in getFileList"
            :key="file.filename"
            v-on:dblclick.stop.prevent="folderOpen(file)"
          >
            <p>{{ file.filename }}</p>
          </div>
        </keep-alive>
      </div>

      <table v-show="!showTiles">
        <tbody>
          <tr class="clickable" v-on:dblclick.stop.prevent="folderBack()">
            <td class="icon-row"></td>
            <td>... {{ parentDir }}</td>
            <td></td>
          </tr>
          <keep-alive>
            <tr
              v-for="file in getFileList"
              :key="file.filename"
              v-on:dblclick.stop.prevent="folderOpen(file)"
            >
              <td></td>
              <td>{{ file.filename }}</td>
              <td>{{ file.isDirectory }}</td>
            </tr>
          </keep-alive>
        </tbody>
      </table>
    </div>
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
} from "../../store/model/Workspace";
import { setupEntry, WorkspaceViewIfc } from "./WorkspaceUtils";

export default defineComponent({
  name: WorkspaceEntryFolderWindow.viewid,
  data() {
    return {
      showTiles: true,
      opaque: true,
      searchstring: "",
      parentDir: "",
    };
  },
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: WorkspaceEntryFolderWindow,
    viewKey: Number,
    workspace: { type: Object as () => WorkspaceViewIfc },
  },
  mounted() {
    this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    scrolling(e: WheelEvent) {
      /**
       * Todo: disable scrolling when zoom factor is too small
       */
      // console.log(this.workspace  );
      
      // if (this.workspace && this.workspace?.getCurrentTransform().scale > 4) {
      //   e.stopPropagation();
      // }
    },
    entrySelectedLocal(type: "add" | "single" | "flip") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
    },
    openDefault() {
      if (this.$props.entry != undefined) {
        this.folderOpen(this.$props.entry.defaultPath);
      }
    },
    setDefault() {
      if (this.$props.entry != undefined) {
        this.$props.entry.defaultPath = this.$props.entry?.path;
      }
    },
    selectEntry(select: "add" | "rem" | "flip") {
      switch (select) {
        case "add":
          this.$el.classList.add("workspace-is-selected");
          break;
        case "rem":
          this.$el.classList.remove("workspace-is-selected");
          break;
        case "flip":
          this.$el.classList.toggle("workspace-is-selected");
          break;
      }
    },
    modifySelection(elements: []) {},
    folderBack() {
      if (this.entry != undefined) {
        this.entry.path = path.dirname(this.entry.path);
        let l = this.entry.path.split("\\");
        this.parentDir = l[l.length - 1];
      }
    },
    folderOpen(folder: FolderWindowFile | String) {
      if (this.entry != undefined) {
        if (folder instanceof FolderWindowFile) {
          if (folder.isDirectory) {
            this.entry.path = folder.path;
          }
        } else {
          this.entry.path = <string>folder;
        }
        let l = this.entry.path.split("\\");
        this.parentDir = l[l.length - 1];
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

        try {
          if (fs.existsSync(this.entry.path)) {
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
        } catch (err) {
          console.error(err);
        }
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
$black: 25px;

.ws-folder-window-wrapper {
  table {
    width: 100%;
  }
  z-index: 100;
  resize: both;
  height: 600px;
  width: 600px;
  min-width: 200px;
  min-height: 200px;
  // will-change: transform;

  position: absolute;
  color: #f1f1f1;
  background: #ffffff07;
  border: 0px solid #949494;
  box-sizing: border-box;
  border-radius: 0px;
  text-align: left;
  vertical-align: top;

  .viewport {
    padding: 10px;

    //   display: none;
    height: calc(100% - #{$black * 3+20});
  }

  .search-bar {
    width: 70%;
    height: $black;

    input,
    input:focus {
      background: white;
      height: 100%;
      border-radius: 0px;
      border: 1px solid #949494;
    }
  }
}

.opaque {
  color: #252525;
  background: #ffffff;
  border: 2px solid #949494;
}

$tile-size: 150px;

.tile-wrapper {
  overflow: auto;
  height: 100%;
  display: grid;
  grid-gap: 15px;
  grid-template-columns: repeat(auto-fit, minmax($tile-size, 1fr));

  .tile {
    background: #c4262600;
    height: $tile-size;
    text-align: center;
    vertical-align: bottom;
    display: flex;

    p {
      align-self: flex-end;
      width: 100%;
      // makes the scaled text smoother in the rendering
      backface-visibility: hidden;
    }

    .opaque {
      background: #a8a8a8;
    }
  }
}

.ws-folder-window-wrapper .ws-folder-window-bar-top {
  width: 100%;
  height: $black;
  background-color: #c4262600;

  .opaque {
    background-color: #5a5a5a00;
  }
}

.workspace-is-selected {
  border: 2px solid #f81fc2;
  box-sizing: border-box;

  .selectable-highlight {
    background-color: #f81fc2;
  }
}
</style>
