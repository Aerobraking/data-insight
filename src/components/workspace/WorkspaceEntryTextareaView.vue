<template>
  <div ref="el" v-on:dblclick="doubleClick" class="ws-entry-textarea-wrapper">
    <div
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      class="ws-textarea-window-bar-top selectable-highlight"
    ></div>

    <div
      class="editor-enabler selectable-highlight"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      @dblclick="enableEditor"
    >
      <p>Double click to enable</p>
    </div>

    <input
      v-model="entry.displayname"
      class="wsentry-displayname ws-entry-zoom-fixed"
      placeholder=""
    />
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
    this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    enableEditor() {
      let div: HTMLElement =
        this.$el.getElementsByClassName("editor-enabler")[0];

      div.style.display = "block";

      div.style.display = "none";
    },
    editorFocusLost() {
      console.log("editorFocusLost");
      let div: HTMLElement =
        this.$el.getElementsByClassName("editor-enabler")[0];

      div.style.display = "block";
    },
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
  // min-height: 100% !important;
  // height: 100% !important;
  height: initial !important;
  flex: 1 !important;
}
</style>
<style scoped lang="scss">
.editor-enabler {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 500;
  background: rgba(255, 255, 255, 0.151);

  p {
    bottom: 150px;
    position: absolute;
    color: black;
    text-align: center;
    width: 100%;
    cursor: pointer;
  }
}

.ws-textarea-window-bar-top {
  width: 100%;
  height: 25px;
  background-color: #ffffff;
}

.workspace-is-selected {
  /* offset-x | offset-y | blur-radius | spread-radius | color */
  // box-shadow: 0px 0px 0px 6px #f81fc2;
  // background-color: #f81fc252;
}

.ws-entry-textarea-wrapper {
  display: flex;
  flex-flow: column;
  // pointer-events: none;
  z-index: 100;
  overflow: visible;
  will-change: transform;
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
