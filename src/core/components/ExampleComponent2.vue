<template>
  <h2>{{ path }}</h2>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "ProjectView",
  props: {
    path: String,
  },
});
</script>

<style lang="scss">
h2 {
  font-size: 24px;
  color: #222;
}
</style>