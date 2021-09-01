<template>
  <div
    ref="el"
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
    @mousedown.left.stop.exact="entrySelectedLocal('single')"
    @click.stop
    v-on:dblclick="doubleClick"
    class="ws-entry-youtube-wrapper"
  >
    <div
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      class="ws-entry-window-bar-top select-element selectable-highlight"
    ></div>

    <input
      @keydown.stop
      @keyup.stop
      v-model="entry.displayname"
      class="wsentry-displayname ws-entry-zoom-fixed"
      placeholder=""
    />

    <div class="inner-wrapper"></div>
  </div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment
import { resize } from "../../utils/resize";

/**
 * @param {String} HTML representing a single element
 * @return {Element}
 */
function htmlToElement(html: string) {
  var template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

import { defineComponent } from "vue";
import { WorkspaceEntryYoutube } from "../../store/model/Workspace";
import { setupEntry } from "./WorkspaceUtils";
export default defineComponent({
  name: "wsentryyoutube",
  data() {
    return {};
  },
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: WorkspaceEntryYoutube,
    viewKey: Number,
  },
  mounted() {
   
    let iframe: any = htmlToElement(
      this.entry != undefined
        ? this.entry?.getHtmlCode()
        : "<div>Video not found.</div>"
    ); 

    this.$el.getElementsByClassName("inner-wrapper")[0].appendChild(iframe);

    // resize(this.$el);
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "flip") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
    },
    doubleClick(e: MouseEvent) {},
    clickStart(e: MouseEvent) {},
  },
  computed: {},
  created() {},
});
</script>
 
<style lang="scss">
.ws-entry-youtube-wrapper { 
  z-index: 100;
  overflow: hidden; 
  position: absolute;
  color: #f1f1f1;
  padding: 10px;
  width: 220px;
  height: 180px;
  background-size: cover;
  box-sizing: border-box;

  .inner-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
  }

  iframe,
  object,
  embed {
    //  pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
