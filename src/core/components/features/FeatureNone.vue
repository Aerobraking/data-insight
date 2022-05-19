<template></template>

<script lang="ts"> 
import { defineComponent } from "vue"; 
import { FeatureType } from "@/core/model/fileactivity/overview/FeatureType";
import { FileActivity } from "@/core/model/fileactivity/FileActivity"; 
import { NodeFeatureNone } from "@/core/model/fileactivity/overview/FeatureNone";

export default defineComponent({
  name: FeatureType.None,
  components: { 
  },
  props: {
    workspace: {
      type: FileActivity,
      required: true,
    },
    model: {
      type: NodeFeatureNone,
      required: true,
    },
  },
});
</script> 

 