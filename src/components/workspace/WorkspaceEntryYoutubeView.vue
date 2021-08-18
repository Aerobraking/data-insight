<template>
  <div
    ref="el"
    @mousemove.stop
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
    @mousedown.left.stop.exact="entrySelectedLocal('single')"
    @click.stop
    v-on:dblclick="doubleClick"
    class="ws-entry-youtube-wrapper"
  >
    <input
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
    this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
    this.$el.style.width = this.entry?.width + "px";
    this.$el.style.height = this.entry?.height + "px";

    let comp = this;

    let iframe: any = htmlToElement(
      this.entry != undefined
        ? this.entry?.getHtmlCode()
        : "<div>Video not found.</div>"
    );
    let c = this;
 
    this.$el.getElementsByClassName("inner-wrapper")[0].appendChild(iframe);

    resize(this.$el);
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

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.ws-entry-youtube-wrapper {
  //  resize: both;
   z-index: 100;
  overflow: hidden;
  backface-visibility: hidden;
  will-change: transform;
  position: absolute;
  color: #f1f1f1;
  padding: 10px;
  width: 220px;
  height: 180px;
  background-size: cover;
  box-sizing: border-box;

  .workspace-is-selected {
    /* offset-x | offset-y | blur-radius | spread-radius | color */
    box-shadow: 0px 0px 0px 6px #f81fc2;
    background-color: #f81fc252;
    resize: none;
  }

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
