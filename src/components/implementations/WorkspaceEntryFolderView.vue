<template>
  <div
    ref="el"
    v-on:dblclick.stop=""
    :class="{ opaque: opaque }"
    class="ws-folder-window-wrapper"
    tabindex="-1"
    @keydown="keydown"
    @drop.capture.stop="drop"
    @mouseup="mouseup"
    @mousemove="mousemove"
    @mouseenter="mouseenter"
    @mouseleave="mouseleave"
  >
    <slot></slot>

    <div
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      class="ws-window-bar-top select-element selectable-highlight"
    ></div>

    <div @mousedown.stop @mousemove.stop class="search-bar">
      <!-- <button @click="showTiles = !showTiles">View</button>
      <button @click="opaque = !opaque">Opaque</button> -->
      <button><ArrowUp @click="folderBack" /></button>
      <button>
        <HomeOutline
          class="showHome"
          @mouseenter="showHome(true)"
          @mouseleave="showHome(false)"
          @click="openDefault"
        />
      </button>
      <button>
        <HomeImportOutline
          @mouseenter="showNewHome(true)"
          @mouseleave="showNewHome(false)"
          @click="setDefault"
        />
      </button>
      <button style="border-left: 1px solid white">
        <FolderPlusOutline @click="createFolder" />
      </button>
      <button><MonitorDashboard @click="openFolderInOS" /></button>
      <button><DeleteVariant @click="deleteSelection" /></button>
      <button
        style="border-left: 1px solid white"
        :class="{ 'hightlight-fg': showTiles }"
      >
        <ViewGrid @click="showTiles = true" />
      </button>
      <button :class="{ 'hightlight-fg': !showTiles }">
        <ViewList @click="showTiles = false" />
      </button>

      <!-- <input
        @keydown.capture.stop
        @keyup.capture.stop
        @mousedown.stop
        @mousemove.stop
        v-model="searchstring"
        class=""
        placeholder="Search ..."
      /> -->
    </div>
    <div @mousedown.stop @mousemove.stop class="breadcrumbs-wrapper">
      <div @mousedown.stop @mousemove.stop class="breadcrumbs"></div>
    </div>

    <div class="viewport" :class="{ opaque: opaque }">
      <div
        class="tile-wrapper container green"
        :options="{ selectables: '.selectable' }"
        @mousedown.left.stop="toggleAll(false)"
      >
        <keep-alive>
          <wsfolderfile
            v-show="showTiles"
            v-for="file in getFileList"
            :entry="file"
            class="tile selectable"
            :class="{ 'item-selected': isSelected(file.id) }"
            @dblclick="folderOpen(file)"
            :key="file.id"
            :searchstring="searchstring"
            :name="file.id"
            @itemClicked2="itemClicked2"
          >
          </wsfolderfile>
        </keep-alive>

        <table v-show="!showTiles">
          <tbody>
            <keep-alive>
              <wsfolderfilelist
                v-for="file in getFileList"
                :entry="file"
                :class="{ 'item-selected': isSelected(file.id) }"
                @dblclick="folderOpen(file)"
                :key="file.id"
                :searchstring="searchstring"
                :name="file.id"
                @itemClicked2="itemClicked2"
              >
              </wsfolderfilelist>
            </keep-alive>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/*

 
 @click.stop
    @mousedown.stop
    @mouseup.stop
    @mousemove.stop

*/
const path = require("path");
const { shell } = require("electron");

import * as WSUtils from "../app/WorkspaceUtils";
import * as watcher from "../../utils/WatchSystem";
import { add, remove, toggle } from "../../utils/ListUtils";
import fs from "fs";
import wsfolderfile from "./FolderFileView.vue";
import wsfolderfilelist from "./FolderFileViewList.vue";
import wsentrydisplayname from "../app/WorkspaceEntryDisplayName.vue";
import { defineComponent } from "vue";
import {
  FolderWindowFile,
  WorkspaceEntryFolderWindow,
} from "../../store/model/FileSystem/FileSystemEntries";
import { setupEntry, WorkspaceViewIfc } from "../app/WorkspaceUtils";
import {
  Drive,
  DriveListRoot,
  DriveListSystemInstance,
} from "../../utils/DriveListSystem";
import { ipcRenderer } from "electron";
import {
  DeleteEmptyOutline,
  HomeOutline,
  HomeImportOutline,
  ArrowLeft,
  ArrowUp,
  MonitorDashboard,
  DeleteVariant,
  ViewList,
  ViewGrid,
  FolderPlusOutline,
} from "mdue";
export function FeatureDecorator() {
    return function  (target:any) { 
    };
}

export default 
defineComponent({
  name: WorkspaceEntryFolderWindow.viewid,
  components: {
    wsfolderfilelist,
    MonitorDashboard,
    DeleteVariant,
    FolderPlusOutline,
    ArrowUp,
    ArrowLeft,
    ViewList,
    ViewGrid,
    HomeOutline,
    HomeImportOutline,
    wsfolderfile,
    wsentrydisplayname,
    DeleteEmptyOutline,
  },
  data(): {
    listSelectionIds: number[];
    showTiles: boolean;
    opaque: boolean;
    dragActive: boolean;
    list: Array<FolderWindowFile>;
    selected: Set<any>;
    lastItemSelected: number | undefined;
  } {
    return {
      listSelectionIds: [],
      lastItemSelected: undefined,
      showTiles: true,
      dragActive: false,
      opaque: true,
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
    searchstring: String,
    workspace: { type: Object as () => WorkspaceViewIfc },
  },
  mounted() {
    const _this = this;
    this.updateUI();
    ipcRenderer.on(
      "move-to-trash-finished",
      function (event: any, directory: string) {
        if (_this.entry.path == directory) _this.updateUI();
      }
    );

    DriveListSystemInstance.register(this.entry.id + "", this.watcherEvent);
    watcher.FileSystemWatcher.registerPath(this.entry.path, this.watcherEvent);
  },
  unmounted() {
    DriveListSystemInstance.unregister(this.entry.id + "");
  },
  inject: ["entrySelected", "setFocusToWorkspace"],
  watch: {
    searchstring: function (newValue: string, oldValue: string) {
      this.searchUpdate();
    },
    // whenever the current folder path changes, update the file list
    "entry.path": function (newPath: string, oldPath: string) {
      watcher.FileSystemWatcher.unregisterPath(oldPath, this.watcherEvent);
      watcher.FileSystemWatcher.registerPath(newPath, this.watcherEvent);
      this.updateUI();
    },
  },
  methods: {
    searchUpdate() {},
    drop(e: DragEvent) {
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
      this.updateUI();
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
    openFolderInOS() {
      shell.openPath(this.entry.path);
    },
    setDefault() {
      if (this.$props.entry != undefined) {
        this.$props.entry.defaultPath = this.$props.entry?.path;
        this.showNewHome(false); // update highlighting
      }
    },
    showNewHome(show: boolean) {
      show = show && this.entry.path != this.entry.defaultPath;
      const div: Element = this.$el.getElementsByClassName("breadcrumbs")[0];
      div.classList.toggle("highlight-path", show);
      const divHome: Element = this.$el.getElementsByClassName("showHome")[0];
      divHome.classList.toggle("move-home-button", show);
    },
    showHome(show: boolean) {
      if (show) {
        this.updateBreadcrumps(this.entry.defaultPath);
      } else {
        this.updateBreadcrumps(this.entry.path);
      }
      const div: Element = this.$el.getElementsByClassName("breadcrumbs")[0];
      div.classList.toggle("highlight-path", show);
    },
    updateBreadcrumps(p: string) {
      const _this = this;

      const div: Element = this.$el.getElementsByClassName("breadcrumbs")[0];

      let listFolders: string[] = p.trim().split("/");

      listFolders = listFolders.filter((s) => s.trim().length > 0);

      div.innerHTML = "";

      let listFoldersRelative: string[] = [];

      var para = document.createElement("button");
      para = document.createElement("button");
      para.setAttribute("path", DriveListRoot);
      para.classList.add("crumb");
      var node = document.createTextNode("Drives");
      para.appendChild(node);
      div.appendChild(para);

      para.addEventListener("click", function (e: MouseEvent) {
        const p = (e.target as Element).getAttribute("path");
        if (p) {
          _this.entry.path = p;
        }
      });

      if (this.entry.path == DriveListRoot) {
        return;
      }

      para = document.createElement("button");
      para.classList.add("crumb-separator");
      node = document.createTextNode("/");
      para.appendChild(node);
      div.appendChild(para);

      for (let i = 0; i < listFolders.length; i++) {
        const f = listFolders[i];
        listFoldersRelative.push(f.trim());
        para = document.createElement("button");
        para.setAttribute("path", listFoldersRelative.join("/"));
        para.classList.add("crumb");
        node = document.createTextNode(f);
        para.appendChild(node);
        div.appendChild(para);

        para.addEventListener("click", function (e: MouseEvent) {
          const p = (e.target as Element).getAttribute("path");
          if (p) {
            _this.entry.path = p;
          }
        });

        if (i < listFolders.length - 1) {
          para = document.createElement("button");
          para.classList.add("crumb-separator");
          node = document.createTextNode("/");
          para.appendChild(node);
          div.appendChild(para);
        }
      }

      div.scrollLeft = div.scrollWidth;
    },
    updateUI(): void {
      /**
       * Update breadcrumbs
       */
      this.updateBreadcrumps(this.entry.path);

      /**
       * Update file list
       */
      this.list = [];

      if (this.entry.path == DriveListRoot) {
        for (let i = 0; i < DriveListSystemInstance.getDrives().length; i++) {
          const d = DriveListSystemInstance.getDrives()[i];
          this.list.push(new FolderWindowFile(d.name, true, d.size));
        }
        return;
      }

      let dir = this.entry.path;

      var count = (dir.match(/is/g) || []).length;
      dir =
        count > 1 && dir.endsWith("/")
          ? dir.slice(0, -1)
          : dir.endsWith("/")
          ? dir
          : dir + "/";

      try {
        fs.accessSync(dir, fs.constants.R_OK);

        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach((file: string) => {
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
              console.log(err);

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
    createFolder() {
      for (let i = 0; i < 500; i++) {
        const element = 500;
        const p = path.join(
          this.entry.path,
          "New Folder" + (i == 0 ? "" : " " + i)
        );
        if (!fs.existsSync(p)) {
          fs.mkdirSync(p);
          setTimeout(() => {
            this.updateUI();
          }, 80);
          return;
        }
      }
    },
    deleteSelection() {
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
        ipcRenderer.send("move-to-trash", {
          filePaths: listFilesToDrag,
          targetDir: this.entry.path,
        });
      }
    },
    setFocusToThis() {
      if (WSUtils.doChangeFocus()) {
        setTimeout(() => {
          this.$el.focus({ preventScroll: true });
        }, 10);
      }
    },
    mouseup(e: MouseEvent) {
      this.dragActive = false;
    },
    /**
     * When the bookmark name is edited, we don't alter the focused object
     * because the user may enter/leave the folder div with the mouse while editing
     */
    cancelFocusEvent(): boolean {
      var x = document.activeElement;
      return (
        x != undefined &&
        x instanceof Element &&
        x.classList.contains("wsentry-displayname")
      );
    },
    mouseenter(e: MouseEvent) {
      if (this.cancelFocusEvent()) return;
      this.setFocusToThis();
    },
    mouseleave(e: MouseEvent) {
      if (this.cancelFocusEvent()) return;
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
          
      console.log("starte drag oper");
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
        this.listSelectionIds = [];
        select ? this.listSelectionIds.push(...this.list.map((e) => e.id)) : 0;
      } else {
        this.list.forEach((e) => toggle(this.listSelectionIds, e.id));
      }
    },
    itemClicked2(id: number, type: "control" | "shift" | "single") {
      switch (type) {
        case "single":
          this.listSelectionIds = [];
          add(this.listSelectionIds, id);
          break;
        case "control":
          toggle(this.listSelectionIds, id);
          break;
        case "shift":
          const entries = this.list;
          if (this.lastItemSelected != undefined) {
            const i1 = entries.findIndex((e) => e.id == this.lastItemSelected),
              i2 = entries.findIndex((e) => e.id == id);
            var sliced = entries.slice(Math.min(i1, i2), Math.max(i1, i2) + 1);

            sliced.forEach((e) => add(this.listSelectionIds, e.id));
          }
          break;
      }
      this.lastItemSelected = id;
      this.dragActive = true;
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
          // if (this.lastItemSelected) {
          //   const i1 = entries.indexOf(this.lastItemSelected),
          //     i2 = entries.indexOf(el);
          //   var sliced = entries.slice(Math.min(i1, i2), Math.max(i1, i2));

          //   sliced.forEach((e) => e.classList.add("item-selected"));
          // }
          // el.classList.add("item-selected");
          break;
      }
      // this.lastItemSelected = el;
      this.dragActive = true;
    },
    setPath(path: string) {
      this.entry.path = path;
    },
    folderBack() {
      if (
        this.entry != undefined &&
        this.entry.path.split("/").length - 1 > 0
      ) {
        this.entry.path = path.dirname(this.entry.path);
        let l = this.entry.path.split("/");
      } else {
        this.entry.path = DriveListRoot;
      }
    },
    folderOpen(folder: FolderWindowFile | String) {
      if (this.entry != undefined) {
        if (folder instanceof FolderWindowFile) {
          if (folder.isDirectory) {
            this.entry.path = folder.path;
          } else {
            shell.openPath(folder.path);
          }
        } else {
          this.entry.path = <string>folder;
        }
        let l = this.entry.path.split("/");
      }
    },
    isSelected(id: number): boolean {
      return this.listSelectionIds.includes(id);
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
          return !this.searchstring || this.searchstring.length < 1
            ? true
            : f.filename
                .toLowerCase()
                .includes(this.searchstring.toLowerCase());
        });

      return this.list;
    },
  },
});
</script>

<style lang="scss">
$color-Selection: rgba(57, 215, 255, 1);
$colorBG: rgb(34, 34, 34);
$colorFG: rgb(234, 234, 234);

.item-selected {
  //box-sizing: border-box;
  //border: 2px solid $color-Selection;
  background: $color-Selection !important;
}

.container {
  user-select: none;
  pointer-events: all;
}

.ws-folder-window-wrapper {
  outline: none;
  display: flex;
  flex-flow: column;

  z-index: 100;
  resize: both;
  height: 600px;
  width: 600px;
  min-width: 200px;
  min-height: 200px;

  position: absolute;
  color: $colorFG;
  background: $colorBG;
  border: 0px solid #949494;
  box-sizing: border-box;
  border-radius: 0px;
  text-align: left;
  vertical-align: top;

  table {
    width: 100%;
    border-spacing: 0;
  }

  .viewport {
    padding: 10px;
    overflow-y: auto;
    overflow-x: hidden;
    height: calc(100% - #{25px * 3+20});
    flex: 1 !important;
    height: initial !important;
    border: none;
    border-top: 1px solid #949494;
  }

  .search-bar {
    height: 34px;
    border-top: 1px solid #949494;

    button {
      cursor: pointer;
      background: transparent;
      margin: 0;
      padding: 0px 7px 0px 7px;
      height: 100%;
      svg {
        vertical-align: middle;
        font-size: 24px;
        padding: 0 10 0 10;
        color: $colorFG;
        margin: 0;
      }
    }
    input,
    input:focus {
      outline: none;
      margin: 0;
      padding: 0;
      padding-left: 10px;
      height: 100%;
      top: 0;
      background: $colorBG;
      border-radius: 0px;
      border: 0px solid #949494;
      border-left: 1px solid #949494;
    }
  }
}

.breadcrumbs-wrapper {
  height: 20px;
  border: none;
  border-top: 1px solid #949494;
  padding: 0px 0px 0px 0px;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  overflow-x: hidden;
  position: relative;
}

.breadcrumbs {
  padding-top: 2px;
  position: absolute;
}

@mixin crumbbase($padding: 8px) {
  height: 100%;
  margin: 0 0px 0 0px;
  background: $colorBG;
  padding: 0px $padding 0px $padding;
  position: relative;
  color: $colorFG;
  top: -2px;
  transition: all 0.2s ease-out;
}

.hightlight-fg {
  color: $color-Selection !important;
  svg {
    color: $color-Selection !important;
  }
}

.move-home-button {
  transform: scale(1.5, 1.5) !important;
  color: $color-Selection !important;
}

.crumb {
  @include crumbbase();
  cursor: pointer;
  &:hover {
    color: $color-Selection !important;
  }
}

.highlight-path .crumb {
  color: $color-Selection !important;
}

.crumb-separator {
  @include crumbbase(4px);
  cursor: initial;
}

.highlight-path .crumb-separator {
  color: $color-Selection !important;
}

.opaque {
  color: $colorFG;
  background: $colorBG;
  border: 2px solid #949494;
}

$tile-size: 150px;

.tile-wrapper {
  height: 100%;
  display: flex;
  flex-flow: row wrap;
  align-items: flex-start;
  align-content: flex-start;
  -webkit-box-orient: horizontal;
  -webkit-box-direction: normal;
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
  background-color: $colorBG;

  .opaque {
    background-color: #5a5a5a00;
  }
}
</style>

function remove(listSelectionIds: number[], id: any) {
  throw new Error("Function not implemented.");
}
