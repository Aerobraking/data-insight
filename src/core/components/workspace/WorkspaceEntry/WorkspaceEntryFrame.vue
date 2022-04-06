<template>
  <div ref="el" class="ws-entry-frame-wrapper"></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import * as WSUtils from "@/core/utils/WorkspaceUtils";
import WorkspaceViewIfc from "@/core/utils/WorkspaceViewIfc";
import * as _ from "underscore";
import { WorkspaceEntryFrame } from "@/core/model/workspace/WorkspaceEntryFrame";
import { insideRect } from "@/core/utils/GeometryUtils";

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
              insideRect(coordFrame, coordEntry) &&
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
  props: {
    entry: WorkspaceEntryFrame,
  },
  inject: ["entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "toggle") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.entry.id, type);
    },
  },
});
</script>

<style scoped lang="scss">
.ws-entry-frame-wrapper {
  padding: 10px;
  background-size: cover;
  box-sizing: border-box;
  background-color: #ffd4d43b;
  border: 0px solid #fff;
  border-radius: 0;
  padding: 0;
  margin: 0;
  overflow: visible;
  pointer-events: none !important;
  z-index: 10;
}
</style>

 