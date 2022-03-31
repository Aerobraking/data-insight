<template>
  <div>
    <button @click="openFile">Open Project File</button>
    <ProjectView :path="pathToFile" />
  </div>
</template>

<script lang="ts"> 
import { defineComponent } from "vue";
import ProjectView from "./ProjectView.vue";
export default defineComponent({
  name: "ProjectSelector",
  components: { ProjectView },
  data() {
    return { pathToFile: "" };
  },
  methods: {
    openFile() {
      // this.pathToFile = FileChooseDialog.select();
    },
  },
});
</script>

<style  lang="scss">
button {
  background: #bbb;
  color: #111;
}
</style>