<template>
  <input
    @keydown.stop
    @keyup.stop
    type="text"
    v-model="entry.displayname"
    class="wsentry-displayname"
    :class="{ 'ws-zoom-fixed': entry.displaynameResize }"
    placeholder=""
  />
</template>

<script lang="ts"> 
import { defineComponent } from "vue";
import { WorkspaceEntry } from "../../store/model/Workspace";  
export default defineComponent({
  name: "wsentrydisplayname",
  data() {
    return {};
  }, 
  props: {
    entry: {
      type: WorkspaceEntry,
      required: true,
    },
    viewKey: Number,
  },
   
});
</script>
 