<template>
  <div
    ref="el"
    v-on:dblclick.stop=""
    :class="{ opaque: opaque }"
    class="ws-folder-window-wrapper"
    @keydown.capture="keydown"
    tabindex="-1"
    @drop.capture.stop="drop"
    @mouseup="mouseup"
    @mousemove="mousemove"
    @mouseenter="mouseenter"
    @mouseleave="mouseleave"
  >
    <wsentrydisplayname :entry="entry" />

    <div
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      class="ws-window-bar-top select-element selectable-highlight"
    ></div>

    <!-- <div class="search-bar">
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
    </div> -->

    <div class="viewport" :class="{ opaque: opaque }">
      <div
        v-show="showTiles"
        class="tile-wrapper container green"
        :options="{ selectables: '.selectable' }"
        @mousedown.left.stop="clearSelection"
      >
        <keep-alive>
          <wsfolderfile
            v-for="file in getFileList"
            :entry="file"
            class="tile selectable"
            @dblclick="folderOpen(file)"
            :key="file.id"
            :name="file.id"
            @itemClicked="itemClicked"
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
import fs from "fs";
const path = require("path");
import wsfolderfile from "./FolderFileView.vue";
import wsentrydisplayname from "./WorkspaceEntryDisplayName.vue";
import { defineComponent } from "vue";
import {
  FolderWindowFile,
  WorkspaceEntryFolderWindow,
} from "../../store/model/Workspace";
import { setupEntry, WorkspaceViewIfc } from "./WorkspaceUtils";
import { ipcRenderer } from "electron";

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
    wsentrydisplayname,
  },
  data(): {
    showTiles: boolean;
    opaque: boolean;
    dragActive: boolean;
    searchstring: string;
    parentDir: string;
    list: Array<FolderWindowFile>;
    selected: Set<any>;
    lastItemSelected: HTMLElement | undefined;
  } {
    return {
      lastItemSelected: undefined,
      showTiles: true,
      dragActive: false,
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
    this.updateFileList();
    watcher.FileSystemWatcher.registerPath(this.entry.path, this.watcherEvent);
  },
  inject: ["entrySelected", "setFocusToWorkspace"],
  watch: {
    // whenever the current folder path changes, update the file list
    "entry.path": function (newPath: string, oldPath: string) {
      watcher.FileSystemWatcher.unregisterPath(oldPath, this.watcherEvent);
      watcher.FileSystemWatcher.registerPath(newPath, this.watcherEvent);
      this.updateFileList();
    },
  },
  methods: {
    drop(e: DragEvent) {
      console.log("paste in folder");

      if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        for (let index = 0; index < e.dataTransfer.files.length; index++) {
          const f = e.dataTransfer.files[index];

          const fileStat = fs.lstatSync(f.path);
          const p = path.normalize(f.path).replace(/\\/g, "/");

          if (fileStat.isDirectory()) {
          } else {
            const filename = path.basename(p);
            fs.copyFile(
              p,
              path.join(this.entry.path, filename),
              fs.constants.COPYFILE_EXCL,
              (err: NodeJS.ErrnoException | null) => {}
            );
          }
        }
      }
    },
    watcherEvent() {
      console.log("watcherEvent");
      
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

      try {
        fs.accessSync(this.entry.path, fs.constants.R_OK);

        if (fs.existsSync(this.entry.path)) {
          fs.readdirSync(this.entry.path).forEach((file: any) => {
            let filePath = path.join(dir, file);
            filePath = path.normalize(filePath).replace(/\\/g, "/");

            try {
              fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);

              const fileStat = fs.lstatSync(filePath);
              this.list.push(
                new FolderWindowFile(
                  filePath,
                  fileStat.isDirectory(),
                  fileStat.isFile() ? fileStat.size : 0
                )
              );
            } catch (err) {
              console.error("no access! " + filePath);
            }
          });
        }
      } catch (err) {
        console.error("no access! " + this.entry.path);
      }
    },
    getEntries: function (): HTMLElement[] {
      return Array.from(this.$el.querySelectorAll(".tile")) as HTMLElement[];
    },
    getModelEntriesFromView(listViews: HTMLElement[]): FolderWindowFile[] {
      let list: FolderWindowFile[] = [];

      for (let index = 0; index < listViews.length; index++) {
        const v = listViews[index];
        let id = Number(v.getAttribute("name"));
        let e = this.list.find((e) => e.id === id);
        if (e != undefined) {
          list.push(e);
        }
      }

      return list;
    },
    setFocusToThis() {
      setTimeout(() => {
        this.$el.focus();
      }, 10);
    },
    mouseup(e: MouseEvent) {
      this.dragActive = false;
    },
    mouseenter(e: MouseEvent) {
      this.setFocusToThis();
    },
    mouseleave(e: MouseEvent) {
      // @ts-ignore: Unreachable code error
      this.setFocusToWorkspace();
    },
    mousemove(e: MouseEvent) {
      if (this.dragActive) {
        let listFilesToDrag: string[] = [];
        let listItems: FolderWindowFile[] = this.getModelEntriesFromView(
          this.getEntries()
        );

        for (let index = 0; index < listItems.length; index++) {
          const e = listItems[index];
          const view = this.getEntries()[index];
          if (view.classList.contains("item-selected")) {
            listFilesToDrag.push(e.path);
          }
        }

        if (listFilesToDrag.length > 0) {
          ipcRenderer.send("ondragstart", listFilesToDrag);
          this.dragActive = false;
        }
      }
    },
    keydown(e: KeyboardEvent) {
      if (e.ctrlKey) {
        switch (e.key.toUpperCase()) {
          case "A":
            this.toggleAll(true);
            e.stopPropagation();
            break;
          case "D":
            this.toggleAll(false);
            e.stopPropagation();
            break;
          default:
            break;
        }
      }
    },
    toggleAll(select: boolean | undefined = undefined) {
      if (select != undefined) {
        this.getEntries().forEach((e) =>
          e.classList.toggle("item-selected", select)
        );
      } else {
        this.getEntries().forEach((e) => e.classList.toggle("item-selected"));
      }
    },
    itemClicked(
      item: FolderWindowFile,
      el: HTMLElement,
      type: "control" | "shift" | "single"
    ) {
      switch (type) {
        case "single":
          this.toggleAll(false);
          el.classList.add("item-selected");
          break;
        case "control":
          el.classList.toggle("item-selected");
          break;
        case "shift":
          const entries = this.getEntries();
          if (this.lastItemSelected) {
            const i1 = entries.indexOf(this.lastItemSelected),
              i2 = entries.indexOf(el);
            var sliced = entries.slice(Math.min(i1, i2), Math.max(i1, i2));

            sliced.forEach((e) => e.classList.add("item-selected"));
          }
          el.classList.add("item-selected");
          break;
      }
      this.lastItemSelected = el;
      this.dragActive = true;
    },
    folderBack() {
      if (this.entry != undefined) {
        this.entry.path = path.dirname(this.entry.path);
        let l = this.entry.path.split("/");
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
        let l = this.entry.path.split("/");
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
.item-selected {
  background: rgba(46, 115, 252, 0.11);
}
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
    height: calc(100% - #{25px * 3+20});
  }

  .search-bar {
    width: 70%;
    height: 25px;

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

.ws-folder-window-wrapper .ws-window-bar-top {
  width: 100%;
  height: 25px;
  background-color: rgb(255, 255, 255);

  .opaque {
    background-color: #5a5a5a00;
  }
}

.workspace-is-selected {
  // .selectable-highlight {
  //   background-color: #f81fc2;
  // }
}
</style>
