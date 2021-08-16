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
    window.addEventListener("keyup", this.keyPressed, true);
    const c = this;

    ipcRenderer.on("fire-file-save", function (event: any, file: string) {
      c.saveFile();
    });

    ipcRenderer.on(
      "insight-file-selected",
      function (event: any, file: string) {
        let tabs: HTMLElement[] = Array.from(
          document.querySelectorAll(".close-file-anim")
        ) as HTMLElement[];

        tabs.forEach((t) => {
          t.classList.add("close-file");
        });

        let jsonRead = fs.readFileSync(file, "utf8");
        let test: InsightFile = deserialize(InsightFile, jsonRead);
        c.$store.commit(MutationTypes.LOAD_INSIGHT_FILE, { insightFile: test });
      }
    );
  },
  methods: {
    saveFile() {
      WSUtils.Events.prepareFileSaving();

      let json = serialize(this.$store.state.loadedFile);

      ipcRenderer.send("save-insight-file", json);
    },
    keyPressed(e: KeyboardEvent) {
      if (e.altKey) {
        switch (e.key) {
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
              this.$store.state.loadedFile.selectedViewIndex = i;
              this.$store.getters.getViewList.forEach(
                (entry: View, index: Number) => {
                  entry.isActive = index === i;
                }
              );
            }
            break;
        }
      }
      if (e.ctrlKey) {
        switch (e.key) {
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
              this.$store.state.loadedFile.selectedViewIndex = i;
              this.$store.getters.getViewList.forEach(
                (entry: View, index: Number) => {
                  entry.isActive = index === i;
                }
              );
            }
            break;
          case "o":
            // ipcRenderer.send("open-insight-file");
            break;

          case "s":
            // this.saveFile();

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
            // let i: number = +e.key;
            // i--;
            // if (i < this.$store.state.loadedFile.views.length) {
            //   this.$store.state.loadedFile.selectedViewIndex = i;
            //   this.$store.getters.getViewList.forEach(
            //     (entry: View, index: Number) => {
            //       entry.isActive = index === i;
            //     }
            //   );
            // }
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
  font-family: Lato, Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
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

div .resizable-prevent-input {
  pointer-events: none;
}
</style>
