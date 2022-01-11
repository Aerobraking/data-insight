<template></template>

<script lang="ts">
import { Tippy } from "vue-tippy";
import { defineComponent } from "vue";
import * as _ from "underscore";
import { Feature } from "@/store/model/app/overview/AbstractNodeFeature";
import { Workspace } from "@/store/model/app/Workspace";
import ColorGradient from "@/components/app/ColorGradient.vue";
import { CogOutline } from "mdue";
import { NodeFeatureNone } from "@/store/model/app/overview/FeatureNone";

export default defineComponent({
  name: Feature.None,
  components: {
    ColorGradient,
    CogOutline,
    Tippy,
  },
  props: {
    workspace: {
      type: Workspace,
      required: true,
    },
    model: {
      type: NodeFeatureNone,
      required: true,
    },
  },
  data(): {} {
    return {};
  },
  unmounted() {},
  mounted() {},
  methods: {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
</style>

 