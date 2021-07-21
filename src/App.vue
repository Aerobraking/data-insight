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
    keyPressed(e: KeyboardEvent) {
      if (e.ctrlKey) {
        switch (e.key) {
          case "o":
            ipcRenderer.send("open-insight-file");
            break;

          case "y":
            console.log("save");
            WSUtils.Events.prepareFileSaving();

            let json = serialize(this.$store.state.loadedFile);

            ipcRenderer.send("save-insight-file", json);

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
  user-select: none;
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
