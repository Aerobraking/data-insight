<template>
  <div ref="el" v-on:dblclick="doubleClick" class="ws-entry-textarea-wrapper">
    <div
      class="editor-enabler-div"
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('toggle')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
    >
      <span class="no-text" v-show="showEmpty()"># No Text</span>
    </div>
    <div
      class="text-editor-div"
      ondragstart="return false"
      @mousedown.left.shift.stop.exact
      @mousedown.left.ctrl.stop.exact
      @mousedown.left.stop.exact
      @keydown.stop
      @keyup.stop
    ></div>
  </div>
</template>

<script lang="ts">
import Editor from "@tinymce/tinymce-vue";
import { defineComponent } from "vue";
import { WorkspaceEntryTextArea } from "@/filesystem/model/FileSystemWorkspaceEntries";
import pell, { exec } from "pell";

export default defineComponent({
  name: "wsentrytextarea",
  components: {
    editor: Editor,
  },
  props: {
    entry: WorkspaceEntryTextArea,
  },
  mounted() {
    let _this: any = this;

    /**
     * Create and add the text editor instance
     */
    const editor = pell.init({
      element: _this.$el.getElementsByClassName("text-editor-div")[0],
      onChange: (html: any) => {
        _this.$props.entry.text = html;
        _this.isEmpty = html;
      },
      actions: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        {
          name: "paragraph",
          result: () => {
            exec("fontSize", "3");
            exec("paragraph");
          },
        },
        {
          name: "heading1",
          result: () => exec("fontSize", "7"),
        },
        {
          name: "heading2",
          result: () => exec("fontSize", "6"),
        },
      ],
      classes: {
        actionbar: "pell-actionbar",
        button: "pell-button",
        content: "pell-content",
        selected: "pell-button-selected",
      },
    });

    _this.$el.getElementsByClassName("pell-content")[0].spellcheck = false;
    _this.$el.getElementsByClassName("pell-content")[0].ondragstart =
      "return false";

    /**
     * add content from the model after init
     */
    editor.content.innerHTML = this.$props.entry
      ? this.$props.entry.text
      : "No text yet";
  },
  inject: ["entrySelected"],
  methods: {
    showEmpty() {
      return this.$props.entry?.text.length == 0;
    },
    editorFocusLost() {},
    entrySelectedLocal(type: "add" | "single" | "toggle") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.entry.id, type);
    },
    doubleClick(e: MouseEvent) {
      e.preventDefault();
    },
  },
});
</script>
  
<style lang="scss">
.no-text {
  position: absolute;
  top: 65px;
  left: 10px;
  color: #e8eaed;
  text-align: left;
  opacity: 0.6;
}

.text-editor-div {
  height: initial !important;
  flex: 1 !important;
  display: flex;
  flex-flow: column;
  overflow-x: hidden;
  overflow-y: hidden;
}

.pell-actionbar {
  overflow: hidden;
  white-space: nowrap;
  background: transparent;
  height: 30px;
  position: fixed;
  width: 100%;
  border-bottom: 2px solid transparent;
  transition: color 0.4s ease-in-out;
}

.pell-content {
  margin-top: 30px;
  height: initial !important;
  flex: 1 !important;
  color: #e8eaed;
  padding: 10px;
  outline: none;
  overflow: auto;
  cursor: text;
  white-space: nowrap;
  background: transparent;
  // transform: scale(3);
  transform-origin: top left;
  transition: color 0.4s ease-in-out;
  // font-size: 100px;
}

.workspace-is-selected .pell-content {
  background: rgba(0, 0, 0, 0.1);
}

.workspace-is-selected .pell-actionbar {
  border-bottom: 2px solid rgb(239, 239, 239);
}

.pell-button {
  color: transparent;
  background: transparent;
  border-radius: 0;
  padding: 0;
  font-size: 14px;
  margin-top: 0px;
  border: none;
  cursor: pointer;
  height: 30px;
  outline: 0;
  width: 30px;
  vertical-align: bottom;
  transition: color 0.4s ease-in-out;
}

.workspace-is-selected .pell-button {
  color: floralwhite !important;
}

.ws-entry-textarea-wrapper {
  display: flex;
  flex-flow: column;
  z-index: 100;
  overflow: visible;
  color: #f1f1f1;
  padding: 10px;
  background-size: cover;
  box-sizing: border-box;
  background-color: rgb(26, 26, 26);
  border-radius: 0;
  padding: 0;
  margin: 0;
}
</style>
