<template>
 
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

 