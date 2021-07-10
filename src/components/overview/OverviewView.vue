<template>
  <div>
    <OverviewCanvas model="model" />
  </div>
</template>

<script lang="ts">
import { Overview } from "@/store/model/OverviewDataModel";
import { defineComponent } from "vue";
import OverviewCanvas from "./OverviewCanvas.vue";

export default defineComponent({
  name: "App",
  components: {
    OverviewCanvas,
  },
  props: {
    model: Overview,
  },
  computed: {},
});
</script>

<style lang="scss">
body {
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
</style>
