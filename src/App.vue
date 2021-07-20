<template>
  <Tabs />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Tabs from "./components/app/Tabs.vue";
import { MutationTypes } from "./store/mutations/mutation-types";
import { InsightFile } from "./store/state";

export default defineComponent({
  name: "App",
  components: {
    Tabs,
  },
  computed: {},
  mounted() {
    document.addEventListener("keyup", this.keyPressed);
  },
  methods: {
    keyPressed(e: KeyboardEvent) {
      var fs = require("fs");

      if (e.ctrlKey) {
        switch (e.key) {
          case "y":
          

            break;
          case "x":
            console.log("load");
            
            let jsonRead = fs.readFileSync(
              "C:\\OneDrive\\Desktop\\insight.in",
              "utf8"
            );

            let test: InsightFile = JSON.parse(jsonRead);

            this.$store.commit(MutationTypes.LOAD_FILE, { insightFile: test });
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
