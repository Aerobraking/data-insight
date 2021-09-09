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

export default defineComponent({
  name: "App",
  components: {
    Tabs,
  },
  computed: {},
  mounted() {
    window.addEventListener("keydown", this.keyPressed, true);
    const c = this;

    ipcRenderer.on("fire-file-save", function (event: any, file: string) {
      c.saveFile();
    });

    ipcRenderer.on("fire-new-file", function (event: any, file: string) {
      c.loadInsightFile(new InsightFile());
    });

    ipcRenderer.on(
      "insight-file-selected",
      function (event: any, file: string) {
        c.loadInsightFileFromPath(file);
      }
    );
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

      let test: InsightFile = deserialize(InsightFile, jsonString);
      this.loadInsightFile(test);
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
      }, 500);
    },
    saveFile() {
      WSUtils.Events.prepareFileSaving();

      let jsonString = serialize(this.$store.state.loadedFile);

      ipcRenderer.send("save-insight-file", jsonString);
    },
    keyPressed(e: KeyboardEvent) {
      console.log("window listener: app");

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
            e.preventDefault();
            e.stopPropagation();
            console.log("prevent: " + e.defaultPrevented);

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
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100%;
  width: 100%;
  position: absolute;
  overflow: hidden;
}

.vue-pan-zoom-scene {
  outline: none;
  width: 100%;
  height: 100%;
  position: fixed;
  padding: 0;
  margin: 0;
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
</style>
