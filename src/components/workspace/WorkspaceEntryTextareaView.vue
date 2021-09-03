<template>
  <div ref="el" v-on:dblclick="doubleClick" class="ws-entry-textarea-wrapper">
    <input
      @keydown.stop
      @keyup.stop
      type="text"
      v-model="entry.displayname"
      class="wsentry-displayname ws-entry-zoom-fixed"
      placeholder=""
    />

    <div
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      class="ws-entry-window-bar-top select-element selectable-highlight"
    ></div>

    <div
      class="editor-enabler"
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
    ></div>

    <editor
      @onSelectionChange="editorFocusLost"
      @blur="editorFocusLost"
      @onFocusOut="editorFocusLost"
      @onBlur="editorFocusLost"
      v-model="entry.text"
      api-key="f80fnw85ov4rnalg9tap5g3uyl41b80o02set6klrlr4remw"
      :init="{
        height: 100,
        menubar: true,
        statusbar: false,
        plugins: [
          'advlist autolink lists link image charmap print preview anchor',
          'searchreplace visualblocks code fullscreen',
          'insertdatetime media table paste code help wordcount',
        ],
        toolbar:
          'undo redo | formatselect | bold italic backcolor | \
           alignleft aligncenter alignright alignjustify | \
           bullist numlist outdent indent | ',
      }"
    />
  </div>
</template>

<script lang="ts">
/*

 @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
    @mousedown.left.stop.exact="entrySelectedLocal('single')"
    @click.stop

<textarea  v-model="entry.text"
     v-on:keyup.stop placeholder="Title"></textarea>
*/
const { shell } = require("electron"); // deconstructing assignment

import Editor from "@tinymce/tinymce-vue";
import { defineComponent } from "vue";
import { WorkspaceEntryTextArea } from "../../store/model/Workspace";
import { setupEntry } from "./WorkspaceUtils";
export default defineComponent({
  name: "wsentrytextarea",
  components: {
    editor: Editor,
  },
  data() {
    return {};
  },
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: WorkspaceEntryTextArea,
    viewKey: Number,
  },
  mounted() {
    // this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    editorFocusLost() {},
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
  
<style  lang="scss">
.tox-tinymce {
  height: initial !important;
  flex: 1 !important;
}
</style>
<style scoped lang="scss">
.ws-entry-textarea-wrapper {
  display: flex;
  flex-flow: column;
  z-index: 100;
  overflow: visible;
  position: absolute;
  color: #f1f1f1;
  padding: 10px;
  width: 600px;
  height: 850px;
  background-size: cover;
  box-sizing: border-box;
  background-color: #f1f1f105;
  border-radius: 0;
  padding: 0;
  margin: 0;
}
</style>
