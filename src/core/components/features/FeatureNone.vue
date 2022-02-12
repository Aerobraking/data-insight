<template></template>

<script lang="ts"> 
import { defineComponent } from "vue"; 
import { FeatureType } from "@/core/model/overview/FeatureType";
import { Workspace } from "@/core/model/Workspace"; 
import { NodeFeatureNone } from "@/core/model/overview/FeatureNone";

export default defineComponent({
  name: FeatureType.None,
  components: { 
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
});
</script> 

 