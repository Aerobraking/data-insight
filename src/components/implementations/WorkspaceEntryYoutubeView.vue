<template>
  <div
    ref="el"
    @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
    @mousedown.left.stop.exact="entrySelectedLocal('single')"
    @click.stop
    class="ws-entry-youtube-wrapper"
  >
    <slot></slot>
    <wsentryalert :entry="entry" />
    <div
      @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
      @mousedown.left.stop.exact="entrySelectedLocal('single')"
      class="ws-window-bar-top select-element selectable-highlight"
    ></div>
    <input
      @mousedown.stop
      @mousemove.stop
      @keydown.stop
      @keyup.stop
      @paste.stop
      class="url-input"
      :class="{ showURL: entry.url.length == 0 }"
      type="text"
      v-model="entry.url"
      placeholder="Enter URL or simply the video id from the URL"
    />

    <div
      class="editor-enabler"
      @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip', $event)"
      @mousedown.left.stop.exact="entrySelectedLocal('single', $event)"
    ></div>

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
  try {
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
  } catch (error) {
    console.log("feeeeehler");
  }

  return template.content.firstChild;
}

import { defineComponent } from "vue"; 
import { setupEntry } from "../app/WorkspaceUtils";
import wsentryalert from "../app/WorkspaceEntryAlert.vue";
import { WorkspaceEntryYoutube } from "@/store/model/implementations/filesystem/FileSystemEntries";
export default defineComponent({
  name: "wsentryyoutube",
  data() {
    return {};
  },
  components: {
    wsentryalert,
  },
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: WorkspaceEntryYoutube,
    viewKey: Number,
  },
  watch: {
    "entry.url": function (newValue: string, oldValue: string) {
      if (newValue != oldValue) this.updateIframe();
    },
  },
  mounted() {
    this.updateIframe();
  },
  inject: ["entrySelected", "entrySelected", "mouseupWorkspace"],
  methods: {
    updateIframe() {
      this.$el.getElementsByClassName("inner-wrapper")[0].innerHTML = "";

      let iframe: any = htmlToElement(
        this.entry ? this.entry.getHtmlCode() : "<div>Video not found.</div>"
      );

      this.$el.getElementsByClassName("inner-wrapper")[0].appendChild(iframe);
    },

    entrySelectedLocal(
      type: "add" | "single" | "flip",
      e: MouseEvent | undefined
    ) {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);

      if (e) {
        // @ts-ignore: Unreachable code error
        this.mouseupWorkspace(e);
      }
    },
  },
  computed: {},
  created() {},
});
</script>
 
<style lang="scss">
.url-input {
  height: 25px;
  outline: none;
  border: none;
  opacity: 0;
  transition: opacity 0.4s ease-in-out;
}

.showURL {
  opacity: 1 !important;
}

.workspace-is-selected .url-input {
  opacity: 1;
}

.inner-wrapper {
  position: relative;
  width: 100%;
  flex: 1 !important; 
  transition: pointer-events 5000ms;
  transition-delay: 5000ms;
}

 

.ws-entry-youtube-wrapper {
  display: flex;
  flex-flow: column;

  z-index: 100;
  position: absolute;
  color: #f1f1f1;
  width: 220px;
  height: 180px;
  background-size: cover;
  box-sizing: border-box;

  iframe,
  object,
  embed { 
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
