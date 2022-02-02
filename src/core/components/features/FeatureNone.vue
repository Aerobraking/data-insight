<template></template>

<script lang="ts">
import { Tippy } from "vue-tippy";
import { defineComponent } from "vue";
import * as _ from "underscore";
import { Feature } from "@/core/model/overview/AbstractNodeFeature";
import { Workspace } from "@/core/model/Workspace";
import ColorGradient from "@/core/components/overview/ColorGradient.vue";
import { CogOutline } from "mdue";
import { NodeFeatureNone } from "@/core/model/overview/FeatureNone";

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

 