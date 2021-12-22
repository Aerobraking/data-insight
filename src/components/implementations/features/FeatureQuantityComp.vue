<template>
  <div ref="el" class="color-gradient-div">
    <h1>Hello world Quantity</h1>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import * as _ from "underscore";
import { NodeFeatureQuantity } from "@/store/model/AbstractNodeFeature";

export default defineComponent({
  name: "quantity",
  props: {
    id: String,
    gradient: { type: NodeFeatureQuantity, required: true },
  },
  mounted() {},
  methods: {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
$color-Selection: rgba(57, 215, 255, 1);

 
</style>

 