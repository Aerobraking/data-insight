<template>
  <div
    @mousemove.stop
    @mousedown.ctrl.stop.exact="entrySelectedLocal('flip')"
    @mousedown.stop.exact="entrySelectedLocal('single')"
    @click.stop
    v-on:dblclick="doubleClick"
    class="ws-entry ws-entry-textarea-wrapper"
  >
    <textarea v-on:keyup.stop placeholder="Title"></textarea
    >
  </div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment

import { defineComponent } from "vue";
import { WorkspaceEntryFrame } from "../../store/model/Workspace";
export default defineComponent({
  name: "wsentrytextarea",
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
.workspace-is-selected {
  /* offset-x | offset-y | blur-radius | spread-radius | color */
  box-shadow: 0px 0px 0px 6px #f81fc2;
  background-color: #f81fc252;
  resize: both;
}

.ws-entry-textarea-wrapper {
  overflow: auto;
  will-change: transform;
  position: absolute;
  color: #f1f1f1;
  padding: 10px;
  width: 500px;
  height: 110px;
  background-size: cover;
  box-sizing: border-box;
  background-color: #f1f1f105;
  border-radius: 0;
  padding: 0;
  margin: 0;
  overflow: hidden;
  textarea {
    // makes the scaled text smoother in the rendering
    backface-visibility: hidden;
    resize: none;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    overflow: hidden;
    border: none;
    background-color: transparent;
    color: #f1f1f1;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 80pt;
    outline: none;

    :focus {
      border: none;
      outline: none;
    }
  }
}
</style>
