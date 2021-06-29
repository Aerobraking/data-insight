<template>
  <div
    @click.capture.exact.prevent="selectEntry"
    v-on:dblclick="doubleClick"
    class="ws-entry-file-wrapper"
    :style="{
      //  transform: 'translate(' + getX() + 'px, ' + getY() + 'px' + ')',
      //  transform: '-webkit-translate3d(' + getX() + 'px, ' + getY() + 'px' + ', 0)',
      transform: 'translate3d(' + getX() + 'px, ' + getY() + 'px' + ', 0)',
    }"
    v-bind:class="['mydiv, selectable', { selected: entry.isSelected }]"
  >
    <div class="ws-entry-file-symbol"></div>
    <p class="ws-entry-file-name">{{ entry.name }}</p>
  </div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment

import { defineComponent } from "vue";
import { WorkspaceEntryFile } from "../../store/model/DataModel";
export default defineComponent({
  name: "wsentry",
  data() {
    return {};
  },
  props: {
    entry: WorkspaceEntryFile,
    viewKey: Number,
  },
  mounted() {
    this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
  },
  methods: {
    selectEntry() {
      console.log("adawdawd");

      this.$el.classList.add("workspace-is-selected");
    },
    doubleClick(e: MouseEvent) {
      e.preventDefault();

      //shell.showItemInFolder('filepath') // Show the given file in a file manager. If possible, select the file.
      if (this.$props.entry?.path != undefined) {
        shell.openPath(this.$props.entry?.path); // Open the given file in the desktop's default manner.
      }
    },
    clickStart(e: MouseEvent) {
      // this.$store.dispatch("setIsSelected", {
      //   name: this.file.key,
      //   add: e.ctrlKey,
      //   viewKey: this.viewKey,
      // });
    },

    getX() {
      // return (
      //   this.file.x - (this.file.isSelected ? this.$store.state.dragOffsetX : 0)
      // );
    },
    getY() {
      // return (
      //   this.file.y - (this.file.isSelected ? this.$store.state.dragOffsetY : 0)
      // );
    },
  },
  computed: {},
  created() {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.ws-entry-file-wrapper {
  perspective: 1000;
  backface-visibility: hidden;
  // display: table;
  height: 300px;
  width: 300px;
  will-change: transform;
  position: absolute;
  color: #f1f1f1;

  // display: flex;
  // justify-content: center;
}
.ws-entry-file-symbol {
  height: 100px;
  width: 100px;
  display: inline-block;
  background-color: #f1f1f1;
  border: 1px solid #15141a;
  clear: both;
  color: rgba(61, 61, 61, 0.911);
}
.ws-entry-file-name {
  display: inline-block;
  // text-align: center;
  // vertical-align: middle;
  // display: table-cell;
}
.ws-entry-file-symbol.selected {
  border: 4px solid rgba(197, 41, 41, 0.911);
  // box-shadow: 0 0 4px 4px rgb(223, 73, 73);
  transition: none;
}

.workspace-is-selected {
  border: 5px solid #661652;
}
</style>
