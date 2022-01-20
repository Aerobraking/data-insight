<template>
  <div ref="el" class="ws-entry-frame-wrapper">
    <!-- <wsentrydisplayname :entry="entry" /> -->
     <slot></slot>
    <div class="ws-entry-frame-internal-wrapper">
      <!-- <div
        @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
        @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
        @mousedown.left.stop.exact="entrySelectedLocal('single')"
        class="
          ws-window-bar-top
          select-element
          selectable-highlight
          ws-zoom-fixed
        "
      ></div> -->
    </div>
  </div>
</template>

<script lang="ts">
const { shell } = require("electron");

import { defineComponent } from "vue";
import * as WSUtils from "../app/WorkspaceUtils";
import { setupEntry } from "../app/WorkspaceUtils";
import  WorkspaceViewIfc from "../app/WorkspaceViewIfc";
import * as _ from "underscore";
import wsentrydisplayname from "../app/WorkspaceEntryDisplayName.vue";
import { WorkspaceEntryFrame } from "@/store/model/app/WorkspaceEntryFrame";

_.once(() => {
  WSUtils.Events.registerCallback({
    zoom(transform: { x: number; y: number; scale: number }): void {},
    dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void {
      let addToSelection: Element[] = [];

      /**
       * Collect entries that are inside frames and not yet selected.
       */
      for (let index = 0; index < selection.length; index++) {
        const e: any = selection[index];
        if (e.classList.contains("ws-entry-frame-wrapper")) {
          let coordFrame = workspace.getCoordinatesFromElement(e);

          workspace.getEntries().forEach((el) => {
            let coordEntry = workspace.getCoordinatesFromElement(el);

            if (
              el != e &&
              WSUtils.insideRect(coordFrame, coordEntry) &&
              !selection.includes(el)
            ) {
              addToSelection.push(el);
            }
          });
        }
      }

      selection.push(...addToSelection);
    },
    prepareFileSaving(): void {},
    pluginStarted(modal: boolean): void {},
  });
})();

export default defineComponent({
  name: "wsentryframe",
  components: {
    wsentrydisplayname,
  },
  setup(props) {
    return setupEntry(props, {
      dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void {},
      /**
       * Update the model coordinates with the current ones from the html view.
       */
      prepareFileSaving(): void {},
      zoom(
        transform: { x: number; y: number; scale: number },
        workspace: WorkspaceViewIfc
      ): void {},
      pluginStarted(modal: boolean): void {},
    });
  },
  data() {
    return {};
  },
  props: {
    entry: WorkspaceEntryFrame,
    viewKey: Number, 
  },
  mounted() {},
  inject: ["entrySelected", "entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "toggle") {
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
  // will-change: transform;
  position: absolute;
  padding: 10px;
  width: 800px;
  height: 810px;
  background-size: cover;
  box-sizing: border-box;
  background-color: #ffd4d43b;
  border: 0px solid #fff;
  border-radius: 0;
  padding: 0;
  margin: 0;
  overflow: visible;
  z-index: 10;
}

.ws-entry-frame-internal-wrapper {
  overflow: hidden;
  height:100%;
}
</style>

 