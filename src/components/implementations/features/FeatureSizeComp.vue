<template>
  <div ref="el" class="color-gradient-div">
    <h1>Hello world Size</h1>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import * as _ from "underscore"; 

export default defineComponent({
  name: "size",
  props: {
   
  },
  mounted() {},
  methods: {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
$color-Selection: rgba(57, 215, 255, 1);

.color-gradient-div {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  margin: 0;
  margin-top: 5px;

  &:hover {
    cursor: pointer;
    border: 3px solid $color-Selection;
  }
}
.gradient-selected {
  border: 2px solid $color-Selection;
}
</style>

 