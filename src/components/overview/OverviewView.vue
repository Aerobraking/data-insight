<template>
  <div class="overview-viewport"></div>
</template>

<script lang="ts">
import { Overview } from "@/store/model/OverviewDataModel";
import { Workspace } from "@/store/model/Workspace";
import { defineComponent } from "vue";
import {
  EngineState,
  OverviewEngine,
} from "../workspace/overview/OverviewEngine";
import OverviewCanvas from "./OverviewCanvas.vue";

export default defineComponent({
  el: ".overview-viewport",
  name: "App",
  components: {
    OverviewCanvas,
  },
  props: {
    model: Workspace,
  },
  data(): {
    overviewEngine: OverviewEngine | null;
    state: EngineState;
  } {
    return {
      overviewEngine: null,
      state: new EngineState(),
    };
  },
  mounted() {
    this.overviewEngine = new OverviewEngine(this.$el, this.state);

  //  this.overviewEngine.start();
  },
  computed: {},
});
</script>

 