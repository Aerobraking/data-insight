<template>
  <Tabs />
</template>

<script lang="ts">
import * as WSUtils from "./components/workspace/WorkspaceUtils";
import { deserialize, plainToClass, serialize } from "class-transformer";
import { ipcRenderer } from "electron";
import { defineComponent } from "vue";
import Tabs from "./components/app/Tabs.vue";
import { MutationTypes } from "./store/mutations/mutation-types";
import { InsightFile } from "./store/state";
import { View } from "./store/model/DataModel";

var fs = require("fs");

ipcRenderer.on("log", (event, log) => {
  console.log("log", log);
});

export default defineComponent({
  name: "App",
  components: {
    Tabs,
  },
  computed: {},
  mounted() {
    window.addEventListener("keydown", this.keydown, false);
    const _this = this;

    ipcRenderer.on(
      "fire-file-save",
      function (event: any, chooseFile: boolean) {
        _this.saveFile(false, chooseFile, false);
      }
    );

    ipcRenderer.on("fire-new-file", function (event: any, file: string) {
      _this.loadInsightFile(new InsightFile());
    });

    ipcRenderer.on("fire-file-saved", function (event: any, filepath: string) {
      _this.$store.state.loadedFile.settings.filePath = filepath;
    });

    ipcRenderer.on(
      "fire-file-save-path-selected",
      function (event: any, filepath: string) {
        _this.$store.state.loadedFile.settings.filePath = filepath;
        _this.saveFile(false, false, true);
      }
    );

    ipcRenderer.on(
      "insight-file-selected",
      function (event: any, file: string) {
        _this.loadInsightFileFromPath(file);
      }
    );

    ipcRenderer.on("app-close", (_) => {
      _this.saveFile(true);
      ipcRenderer.send("closed");
    });

    ipcRenderer.on("send-args", (event: any, args: string[]) => {
      for (let i = 0; i < args.length; i++) {
        const a = args[i];

        try {
          if (fs.existsSync(a) && a.endsWith(".ins")) {
            _this.loadInsightFileFromPath(a);
            return;
          }
        } catch (err) {
          console.error(err);
        }
      }
    });

    ipcRenderer.send("get-args", {});
  },
  provide() {
    return {
      loadInsightFileFromPath: this.loadInsightFileFromPath,
      loadInsightFile: this.loadInsightFile,
    };
  },
  methods: {
    loadInsightFileFromPath(path: string) {
      let jsonString = fs.readFileSync(path, "utf8");
      let file: InsightFile = deserialize(InsightFile, jsonString);
      file.initAfterLoading();
      this.loadInsightFile(file);
    },
    loadInsightFile(file: InsightFile) {
      let tabs: HTMLElement[] = Array.from(
        document.querySelectorAll(".close-file-anim")
      ) as HTMLElement[];

      tabs.forEach((t) => {
        t.classList.add("close-file");
      });

      this.$store.commit(MutationTypes.LOAD_INSIGHT_FILE, {
        insightFile: file,
      });

      setTimeout(() => {
        tabs.forEach((t) => {
          t.classList.remove("close-file");
        });

        ipcRenderer.send("insight-file-loaded", {
          filePath: file.settings.filePath,
        });
      }, 500);
    },
    saveFile(
      temp: boolean = false,
      chooseFile: boolean = false,
      executeSave: boolean = false
    ) {
      WSUtils.Events.prepareFileSaving();

      let jsonString = serialize(this.$store.state.loadedFile);

      ipcRenderer.send("save-insight-file", {
        json: jsonString,
        temp: temp,
        path: this.$store.state.loadedFile.settings.filePath,
        chooseFile: chooseFile,
        executeSave: executeSave,
      });
    },
    keydown(e: KeyboardEvent) {
      if (e.ctrlKey) {
        switch (e.key) {
          case "t":
            this.$store.commit(MutationTypes.CREATE_WORKSPACE);
            e.preventDefault();
            e.stopPropagation();
            break;
          case "Tab":
            let listSize = this.$store.getters.getViewList.length;
            if (listSize == 0) return;
            let activeIndex = this.$store.getters.getActiveWorkspaceIndex;

            activeIndex = e.shiftKey ? --activeIndex : ++activeIndex;
            activeIndex =
              activeIndex > listSize - 1
                ? 0
                : activeIndex < 0
                ? listSize - 1
                : activeIndex;
            this.$store.commit(MutationTypes.SELECT_WORKSPACE, {
              index: activeIndex,
            });
            e.preventDefault();
            e.stopPropagation();
            break;
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            let i: number = +e.key;
            i--;
            if (i < this.$store.state.loadedFile.views.length) {
              this.$store.getters.getViewList.forEach(
                (entry: View, index: Number) => {
                  entry.isActive = index === i;
                }
              );
            }
            e.preventDefault();
            e.stopPropagation();
            break;
        }
      } else {
        switch (e.key) {
          case "Delete":
          case "delete":
            break;
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            break;
        }
      }
    },
  },
});
</script>

<style lang="scss">
* {
  user-select: none;
}

body {
  margin: 0;
  padding: 0;
  background-color: rgb(53, 53, 53);
}

#app {
  display: flex;
  flex-flow: column;
  font-family: Lato, Avenir, Helvetica, Arial, sans-serif;
  //  -webkit-font-smoothing: antialiased;
  //  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100%;
  width: 100%;
  position: absolute;
  overflow: hidden;
}

div .resizer {
  width: 10px;
  height: 10px;
  background: blue;
  position: absolute;
  right: 0;
  bottom: 0;
  cursor: se-resize;
}

div .prevent-input {
  pointer-events: none;
}

/**


*/

/* Functional styling;
 * These styles are required for noUiSlider to function.
 * You don't need to change these rules to apply your design.
 */
.noUi-target,
.noUi-target * {
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  -webkit-user-select: none;
  -ms-touch-action: none;
  touch-action: none;
  -ms-user-select: none;
  -moz-user-select: none;
  user-select: none;
  -moz-box-sizing: border-box;
  box-sizing: border-box;
}
.noUi-target {
  position: relative;
}
.noUi-base,
.noUi-connects {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}
/* Wrapper for all connect elements.
 */
.noUi-connects {
  overflow: hidden;
  z-index: 0;
}
.noUi-connect,
.noUi-origin {
  will-change: transform;
  position: absolute;
  z-index: 1;
  top: 0;
  right: 0;
  -ms-transform-origin: 0 0;
  -webkit-transform-origin: 0 0;
  -webkit-transform-style: preserve-3d;
  transform-origin: 0 0;
  transform-style: flat;
}
.noUi-connect {
  height: 100%;
  width: 100%;
}
.noUi-origin {
  height: 100%;
  width: 10%;
}
/* Offset direction
 */
.noUi-txt-dir-rtl.noUi-horizontal .noUi-origin {
  left: 0;
  right: auto;
}
/* Give origins 0 height/width so they don't interfere with clicking the
 * connect elements.
 */
.noUi-vertical .noUi-origin {
  width: 0;
}
.noUi-horizontal .noUi-origin {
  height: 0;
}
.noUi-handle {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  position: absolute;
}
.noUi-touch-area {
  height: 100%;
  width: 100%;
}
.noUi-state-tap .noUi-connect,
.noUi-state-tap .noUi-origin {
  -webkit-transition: transform 0.3s;
  transition: transform 0.3s;
}
.noUi-state-drag * {
  cursor: inherit !important;
}
/* Slider size and handle placement;
 */
.noUi-horizontal {
  height: 18px;
}
.noUi-horizontal .noUi-handle {
  width: 34px;
  height: 28px;
  right: -17px;
  top: -6px;
}
.noUi-vertical {
  width: 18px;
}
.noUi-vertical .noUi-handle {
  width: 28px;
  height: 20px; // 34
  right: -6px;
  top: -17px;
}
.noUi-txt-dir-rtl.noUi-horizontal .noUi-handle {
  left: -17px;
  right: auto;
}
/* Styling;
 * Giving the connect element a border radius causes issues with using transform: scale
 */
.noUi-target {
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #d3d3d3;
  box-shadow: inset 0 1px 1px #f0f0f0, 0 3px 6px -5px #bbb;
}
.noUi-connects {
  border-radius: 3px;
}
.noUi-connect {
  background: #3fb8af;
}
/* Handles and cursors;
 */
.noUi-draggable {
  cursor: ew-resize;
}
.noUi-vertical .noUi-draggable {
  cursor: ns-resize;
}
.noUi-handle {
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  background: #fff;
  cursor: default;
  box-shadow: inset 0 0 1px #fff, inset 0 1px 7px #ebebeb, 0 3px 6px -3px #bbb;
}
.noUi-active {
  box-shadow: inset 0 0 1px #fff, inset 0 1px 7px #ddd, 0 3px 6px -3px #bbb;
}
/* Handle stripes;
 */
.noUi-handle:before,
.noUi-handle:after {
  content: "";
  display: block;
  position: absolute;
  height: 14px;
  width: 1px;
  background: #e8e7e6;
  left: 14px;
  top: 6px;
}
.noUi-handle:after {
  left: 17px;
}
.noUi-vertical .noUi-handle:before,
.noUi-vertical .noUi-handle:after {
  width: 14px;
  height: 1px;
  left: 6px;
  top: 14px;
}
.noUi-vertical .noUi-handle:after {
  top: 17px;
}
/* Disabled state;
 */
[disabled] .noUi-connect {
  background: #b8b8b8;
}
[disabled].noUi-target,
[disabled].noUi-handle,
[disabled] .noUi-handle {
  cursor: not-allowed;
}
/* Base;
 *
 */
.noUi-pips,
.noUi-pips * {
  -moz-box-sizing: border-box;
  box-sizing: border-box;
}
.noUi-pips {
  position: absolute;
  color: #999;
}
/* Values;
 *
 */
.noUi-value {
  position: absolute;
  white-space: nowrap;
  text-align: center;
}
.noUi-value-sub {
  color: #ccc;
  font-size: 10px;
}
/* Markings;
 *
 */
.noUi-marker {
  position: absolute;
  background: #ccc;
}
.noUi-marker-sub {
  background: #aaa;
}
.noUi-marker-large {
  background: #aaa;
}
/* Horizontal layout;
 *
 */
.noUi-pips-horizontal {
  padding: 10px 0;
  height: 80px;
  top: 100%;
  left: 0;
  width: 100%;
}
.noUi-value-horizontal {
  -webkit-transform: translate(-50%, 50%);
  transform: translate(-50%, 50%);
}
.noUi-rtl .noUi-value-horizontal {
  -webkit-transform: translate(50%, 50%);
  transform: translate(50%, 50%);
}
.noUi-marker-horizontal.noUi-marker {
  margin-left: -1px;
  width: 2px;
  height: 5px;
}
.noUi-marker-horizontal.noUi-marker-sub {
  height: 10px;
}
.noUi-marker-horizontal.noUi-marker-large {
  height: 15px;
}
/* Vertical layout;
 *
 */
.noUi-pips-vertical {
  padding: 0 10px;
  height: 100%;
  top: 0;
  left: 100%;
}
.noUi-value-vertical {
  -webkit-transform: translate(0, -50%);
  transform: translate(0, -50%);
  padding-left: 25px;
}
.noUi-rtl .noUi-value-vertical {
  -webkit-transform: translate(0, 50%);
  transform: translate(0, 50%);
}
.noUi-marker-vertical.noUi-marker {
  width: 5px;
  height: 2px;
  margin-top: -1px;
}
.noUi-marker-vertical.noUi-marker-sub {
  width: 10px;
}
.noUi-marker-vertical.noUi-marker-large {
  width: 15px;
}

/**
Left Pips
 */
.noUi-pips-vertical {
  padding: 0 20px !important;
  height: 100%;
  top: 0;
  right: 150%;
  left: initial !important;
}
.noUi-marker-vertical.noUi-marker {
  width: 5px;
  height: 2px;
  margin-top: -1px;
  right: 0px !important;
}
.noUi-value-vertical {
  transform: translate(0, -50%);
  padding-left: 0;
  text-align: right !important;
  min-width: 200px !important;
  right: 21px !important;
}
.noUi-marker-vertical.noUi-marker-large {
  width: 15px !important;
}

/**
Tooltips
 */

.noUi-active .noUi-tooltip {
  display: block;
}

.noUi-tooltip {
  display: none;
  position: absolute;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  background: #fff;
  color: #000;
  padding: 5px;
  text-align: center;
  white-space: nowrap;
}
.noUi-horizontal .noUi-tooltip {
  -webkit-transform: translate(-50%, 0);
  transform: translate(-50%, 0);
  right: 50%;
  bottom: 120%;
}
.noUi-vertical .noUi-tooltip {
  -webkit-transform: translate(0, -50%);
  transform: translate(0, -50%);
  top: 50%;
  right: 120%;
  //left: 120%;
}
.noUi-horizontal .noUi-origin > .noUi-tooltip {
  -webkit-transform: translate(50%, 0);
  transform: translate(50%, 0);
  left: auto;
  bottom: 10px;
}
.noUi-vertical .noUi-origin > .noUi-tooltip {
  -webkit-transform: translate(0, -18px);
  transform: translate(0, -18px);
  top: auto;
  right: 28px;
}
</style>
