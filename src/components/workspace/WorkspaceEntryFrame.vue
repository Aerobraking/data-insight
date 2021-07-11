<template>
  <div
    @mousemove.stop
    @mousedown.ctrl.stop.exact="entrySelectedLocal('flip')"
    @mousedown.stop.exact="entrySelectedLocal('single')"
    @click.stop
    v-on:dblclick="doubleClick"
    class="ws-entry-frame-wrapper"
  ></div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment

import { defineComponent } from "vue";
import { WorkspaceEntryFrame } from "../../store/model/Workspace";
export default defineComponent({
  name: "wsentryframe",
  data() {
    return {};
  },
  props: {
    entry: WorkspaceEntryFrame,
    viewKey: Number,
  },
  mounted() {
    this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "flip") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
    },
    doubleClick(e: MouseEvent) {
      e.preventDefault();
    },
    clickStart(e: MouseEvent) {},
  },
  computed: {},
  created() {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">


.ws-entry-frame-wrapper {
  overflow: auto;
  will-change: transform;
  position: absolute;
  padding: 10px;
  width: 800px;
  height: 810px;
  background-size: cover;
  box-sizing: border-box;
  background-color: #ffd4d43b;
  border: 1px solid #fff;
  border-radius: 0;
  padding: 0;
  margin: 0; 
}
</style>
