<template>
  <div
    ref="el"
    @mouseup.stop
    @mousedown.stop
    @mousemove.stop
    @click.stop
    v-on:dblclick.stop=""
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
      <button @click="folderBack">Go Up</button>
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

    <div class="viewport" :class="{ opaque: opaque }">
      <div
        v-show="showTiles"
        class="tile-wrapper container green"
        :options="{ selectables: '.selectable' }"
      >
        <keep-alive>
          <wsfolderfile
            v-for="file in getFileList"
            :entry="file"
            class="tile selectable"
            @dblclick="folderOpen(file)"
            :key="file.id"
            :name="file.id"
          >
          </wsfolderfile>
        </keep-alive>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/*


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

 @click.stop
    @mousedown.stop
    @mouseup.stop
    @mousemove.stop

*/
const { shell } = require("electron"); // deconstructing assignment
import SelectionArea from "@viselect/vanilla";
import * as watcher from "./../../utils/WatchSystem";
const fs = require("fs");
const path = require("path");
const chokidar = window.require("chokidar");
import wsfolderfile from "./FolderFileView.vue";
import { defineComponent } from "vue";
import {
  FolderWindowFile,
  WorkspaceEntryFolderWindow,
} from "../../store/model/Workspace";
import { setupEntry, WorkspaceViewIfc } from "./WorkspaceUtils";

function processLargeArrayAsync(
  array: any[],
  fn: (context: any, item: any, index: number, array: any[]) => void,
  chunk: number | undefined = undefined,
  context: any | undefined = undefined
) {
  context = context || window;
  chunk = chunk || 50;
  var index = 0;
  function doChunk() {
    var cnt = chunk || 50;
    while (cnt-- && index < array.length) {
      // callback called with args (value, index, array)
      fn.call(context, context, array[index], index, array);
      ++index;
    }
    if (index < array.length) {
      // set Timeout for async iteration
      setTimeout(doChunk, 1);
    }
  }
  doChunk();
}

function readFiles(
  dir: string,
  processFile: (filepath: string, name: string, ext: string, stat: any) => void
) {
  // read directory
  fs.readdir(dir, (error: any, fileNames: any) => {
    if (error) throw error;

    fileNames.forEach((filename: any) => {
      // get current file name
      const name = path.parse(filename).name;
      // get current file extension
      const ext = path.parse(filename).ext;
      // get current file path
      const filepath = path.resolve(dir, filename);

      // get information about the file
      fs.stat(filepath, function (error: any, stat: any) {
        if (error) throw error;

        // check if the current path is a file or a folder
        const isFile = stat.isFile();

        // exclude folders
        if (isFile) {
          // callback, do something with the file
          processFile(filepath, name, ext, stat);
        }
      });
    });
  });
}

export default defineComponent({
  name: WorkspaceEntryFolderWindow.viewid,
  components: {
    wsfolderfile,
  },
  data(): {
    showTiles: boolean;
    opaque: boolean;
    searchstring: string;
    parentDir: string;
    list: Array<FolderWindowFile>;
    selected: Set<any>;
  } {
    return {
      showTiles: true,
      opaque: true,
      searchstring: "",
      parentDir: "",
      list: [],
      selected: new Set(),
    };
  },
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: {
      type: WorkspaceEntryFolderWindow,
      required: true,
    },
    viewKey: Number,
    workspace: { type: Object as () => WorkspaceViewIfc },
  },
  mounted() {
    // this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;

    this.updateFileList();

    watcher.FileSystemWatcher.registerPath(this.entry.path, this.watcherEvent);
  },
  inject: ["entrySelected", "entrySelected"],
  watch: {
    // whenever question changes, this function will run
    "entry.path": function (newPath: string, oldPath: string) {
      watcher.FileSystemWatcher.unregisterPath(oldPath, this.watcherEvent);
      watcher.FileSystemWatcher.registerPath(newPath, this.watcherEvent);
      this.updateFileList();
    },
  },
  methods: {
    watcherEvent() {
      this.updateFileList();
    },
    scrolling(e: WheelEvent) {
      /**
       * Todo: disable scrolling when zoom factor is too small
       */
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
    updateFileList(): void {
      this.list = [];
      let c = this;

      const dir = this.entry.path;

      // readFiles(
      //   dir,
      //   (filepath: string, name: string, ext: string, stat: any) => {
      //     console.log("add file");
          
      //     this.list.push(
      //       new FolderWindowFile(
      //         filepath,
      //         stat.isDirectory(),
      //         stat.isFile ? stat.size : 0
      //       )
      //     );
      //   }
      // );

      // try {
      //   processLargeArrayAsync(
      //     fs.readdirSync(this.entry.path),
      //     (context: any, item: any, index: number, array: any[]) => {
      //       const filePath = path.join(dir, item);
      //       const fileStat = fs.lstatSync(filePath);
      //       console.log(filePath);

      //       this.list.push(
      //         new FolderWindowFile(
      //           filePath,
      //           fileStat.isDirectory(),
      //           fileStat.isFile ? fileStat.size : 0
      //         )
      //       );
      //     }
      //   );
      // } catch (err) {
      //   console.error(err);
      // }

      try {
        if (fs.existsSync(this.entry.path)) {
          fs.readdirSync(this.entry.path).forEach((file: any) => {
            const filePath = path.join(dir, file);
            const fileStat = fs.lstatSync(filePath);
            this.list.push(
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
      this.entry.fileList = this.list;
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

  computed: {
    getFileList(): Array<FolderWindowFile> {
      this.list
        .sort((a: FolderWindowFile, b: FolderWindowFile) => {
          if (a.isDirectory === b.isDirectory) {
            return a.filename.localeCompare(b.filename);
          }
          return a.isDirectory ? -1 : 1;
        })
        .filter((f: FolderWindowFile) => {
          return this.searchstring.length < 1
            ? true
            : f.filename
                .toLowerCase()
                .includes(this.searchstring.toLowerCase());
        });

      return this.list;
    },
  },

  created() {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
$black: 25px;

.container {
  user-select: none;
  pointer-events: all;
}

.selection-area {
  background: rgba(46, 115, 252, 0.11);
  border: 2px solid rgba(98, 155, 255, 0.81);
  border-radius: 0.1em;
}

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
    overflow-y: auto;
    overflow-x: hidden;
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
  height: 100%;
  display: grid;
  grid-gap: 15px;
  grid-template-columns: repeat(auto-fit, minmax($tile-size, 1fr));

  .tile {
    // background: #c4262600;
    // height: $tile-size;
    // text-align: center;
    // p {
    //   align-self: flex-end;
    //   width: 100%;
    //   // makes the scaled text smoother in the rendering
    //   backface-visibility: hidden;
    // }

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
