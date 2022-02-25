<template></template>

<script lang="ts"> 
import { defineComponent } from "vue"; 
import { FeatureType } from "@/core/model/workspace/overview/FeatureType";
import { Workspace } from "@/core/model/workspace/Workspace"; 
import { NodeFeatureNone } from "@/core/model/workspace/overview/FeatureNone";

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

 