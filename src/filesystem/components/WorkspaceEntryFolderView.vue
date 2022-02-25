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
    @mousedown.capture="mousedown"
  >
    <div
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      @mouseup="mouseup"
      class="ws-window-bar-top select-element selectable-highlight"
    ></div>

    <div @mousedown.stop @mousemove.stop class="search-bar">
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
        :class="{ 'hightlight-fg': entry.mode == 'tile' }"
      >
        <ViewGrid @click="setMode($event, 'tile')" />
      </button>
      <button :class="{ 'hightlight-fg': entry.mode == 'list' }">
        <ViewList @click="setMode($event, 'list')" />
      </button>
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
        <wsfolderfile
          v-show="entry.mode == 'tile'"
          v-for="file in getFileList"
          :entry="file"
          class="tile selectable"
          :class="{ 'item-selected': isSelected(file.id) }"
          @dblclick="folderOpen(file)"
          :key="file.id"
          :searchstring="searchstring"
          :name="file.id"
          @itemClicked="itemClicked"
        >
        </wsfolderfile>

        <table v-show="entry.mode == 'list'">
          <tbody>
            <wsfolderfilelist
              v-for="file in getFileList"
              :entry="file"
              :class="{ 'item-selected': isSelected(file.id) }"
              @dblclick="folderOpen(file)"
              :key="file.id"
              :searchstring="searchstring"
              :name="file.id"
              @itemClicked="itemClicked"
            >
            </wsfolderfilelist>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
const path = require("path");
const { shell } = require("electron");

import * as WSUtils from "@/core/utils/WorkspaceUtils";
import * as watcher from "../utils/WatchSystemMain";
import { add, remove, toggle } from "@/core/utils/ListUtils";
import fs from "fs";
import wsfolderfile from "./FolderFileViewGrid.vue";
import wsfolderfilelist from "./FolderFileViewList.vue";
import { defineComponent } from "vue";
import {
  FolderWindowFile,
  WorkspaceEntryFolderWindow,
} from "@/filesystem/model/FileSystemWorkspaceEntries";
import fse, { Dirent } from "fs-extra";
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
import {
  DriveListRoot,
  DriveListSystemInstance,
} from "@/filesystem/utils/DriveListSystem";
import WorkspaceViewIfcWrapper from "@/core/utils/WorkspaceViewIfcWrapper";

export default defineComponent({
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
    observer: IntersectionObserver | undefined;
    eventOnMouseup:
      | { id: number; type: "control" | "shift" | "single" }
      | undefined;
  } {
    return {
      listSelectionIds: [],
      eventOnMouseup: undefined,
      lastItemSelected: undefined,
      showTiles: true,
      dragActive: false,
      opaque: true,
      observer: undefined,
      list: [],
      selected: new Set(),
    };
  },
  props: {
    entry: { type: WorkspaceEntryFolderWindow, required: true },
    searchstring: String,
    workspace: { type: WorkspaceViewIfcWrapper, required: true },
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

    DriveListSystemInstance.register(this.entry.id + "", this.driveListEvent);
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
    setMode(e: MouseEvent, mode: "list" | "tile", all: boolean = false) {
      if (e.shiftKey) {
        this.workspace
          ?.getModelEntries()
          .forEach((e) =>
            e instanceof WorkspaceEntryFolderWindow ? (e.mode = mode) : 0
          );
      } else {
        this.entry.mode = mode;
      }
    },
    searchUpdate() {},
    drop(e: DragEvent) {
      if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        let listFiles = [];
        for (let index = 0; index < e.dataTransfer.files.length; index++) {
          const f = e.dataTransfer.files[index];
          listFiles.push(f.path);
        }

        this.handleFileDrop(listFiles);
      }
    },
    handleFileDrop(listFiles: string[]) {
      for (let index = 0; index < listFiles.length; index++) {
        const f = path.normalize(listFiles[index]).replace(/\\/g, "/");
        const fileStat = fs.lstatSync(f);
        if (fileStat.isDirectory()) {
          // To copy a folder or file

          const srcDir = f;
          const destDir = path.join(this.entry.path, path.basename(f));

          fse
            .copy(srcDir, destDir, {
              overwrite: false,
              preserveTimestamps: true,
              recursive: true,
            })
            .then(() => {
              this.updateUI();
            });
        } else {
          const filename = path.basename(f);
          fse
            .copyFile(
              f,
              path.join(this.entry.path, filename),
              fs.constants.COPYFILE_EXCL
            )
            .then(() => this.updateUI());
        }
      }
    },
    driveListEvent() {
      this.updateUI();
    },
    watcherEvent(type: string) {
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
    entrySelectedLocal(type: "add" | "single" | "toggle") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.entry.id, type);
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
      Array.from<HTMLElement>(
        this.$el.getElementsByClassName("folder-file")
      ).forEach((element) => {
        if (this.observer != undefined) {
          this.observer.unobserve(element);
        }
      });

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
          this.list.push(new FolderWindowFile(d.path, true, d.size, d.name));
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
          this.entry.alert = undefined;
          fs.readdirSync(dir, { withFileTypes: true }).forEach(
            (file: Dirent) => {
              let filePath = path.join(dir, file.name);
              filePath = path.normalize(filePath).replace(/\\/g, "/");
              try {
                fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
                let size = 0;
                if (file.isFile()) {
                  const fileStat = fs.lstatSync(filePath);
                  size = fileStat.size;
                }

                this.list.push(
                  new FolderWindowFile(filePath, file.isDirectory(), size)
                );
              } catch (err) {
                console.error("no access! " + filePath);
              }
            }
          );
        }
      } catch (err) {
        this.entry.alert = `Folder ${this.entry.path} does not exist`;
        console.error("no access! " + this.entry.path);
      }

      if (!this.observer) {
        this.observer = new IntersectionObserver(this.observerUpdate, {
          rootMargin: "1000px 0px 1000px 0px",
          root: this.$el.getElementsByClassName("viewport")[0],
        });
      }

      setTimeout(() => {
        Array.from<HTMLElement>(
          this.$el.getElementsByClassName("folder-file")
        ).forEach((element) => {
          if (this.observer) this.observer.observe(element);
        });
      }, 100);
    },
    observerUpdate: function (
      entries: IntersectionObserverEntry[],
      observer: IntersectionObserver
    ) {
      const views: Element[] = entries
        .filter((e) => e.isIntersecting)
        .map((e) => e.target);

      const models = this.getModelEntriesFromView(views);

      models.forEach((e) => {
        e.loadImage = true;
      });
    },
    getEntries: function (): HTMLElement[] {
      return Array.from(this.$el.querySelectorAll(".tile")) as HTMLElement[];
    },
    getModelEntriesFromView(listViews: Element[]): FolderWindowFile[] {
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
    mousedown(e: MouseEvent) {},
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
          ipcRenderer.send("ondragstart", listFilesToDrag);
          this.dragActive = false;
        }
      }
    },
    mouseup(e: MouseEvent) {
      if (this.eventOnMouseup) {
        this.handleMouseEvent(
          this.eventOnMouseup.id,
          this.eventOnMouseup.type,
          true
        );
        this.eventOnMouseup = undefined;
      }
      this.dragActive = false;
    },
    keydown(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "Delete":
            this.deleteSelection();
            e.stopImmediatePropagation();
            return;
          case "Backspace":
            this.folderBack();
            e.stopImmediatePropagation();
            return;
          case "f":
          case "y":
          case "t":
            e.stopImmediatePropagation();
            return;
          default:
            break;
        }
      }

      if (e.ctrlKey) {
        switch (e.key) {
          case "a":
            this.toggleAll(true);
            e.stopImmediatePropagation();
            return;
          case "d":
            this.toggleAll(false);
            e.stopImmediatePropagation();
            return;
          case "c":
            WSUtils.clipboard.listFilesClipboard = this.list
              .filter((f) => this.listSelectionIds.includes(f.id))
              .map((f) => f.path);
            e.stopImmediatePropagation();
            return;
          case "v":
            this.handleFileDrop(WSUtils.clipboard.listFilesClipboard);
            WSUtils.clipboard.listFilesClipboard = [];
            e.stopImmediatePropagation();
            return;
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
    itemClicked(id: number, type: "control" | "shift" | "single") {
      if (
        this.listSelectionIds.includes(id) &&
        (type == "control" || type == "single")
      ) {
        this.eventOnMouseup = { id: id, type: type };
      }

      this.handleMouseEvent(id, type);
    },
    handleMouseEvent(
      id: number,
      type: "control" | "shift" | "single",
      skip: boolean = false
    ) {
      switch (type) {
        case "single":
          if (!this.eventOnMouseup || skip) {
            this.listSelectionIds = [];
            add(this.listSelectionIds, id);
          }
          break;
        case "control":
          if (!this.eventOnMouseup || skip) {
            toggle(this.listSelectionIds, id);
          }
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
  transition: color 0.2s ease-out;
  transition-property: background-color, color;
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
 