<template >
  <div ref="el" class="ws-entry" :class="{ sizefixed: !entry.isResizable }">
    <slot class="ws-entry-slot"></slot>
    <wsentrydisplayname :entry="entry" />
    <wsentryalert :entry="entry" />
    <button v-if="entry.isResizable" @dblclick.capture.stop.prevent="dblclick" @mousedown.stop
      class="ws-entry-resize-button ws-zoom-fixed"></button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import wsentrydisplayname from "./WorkspaceEntryDisplayName.vue";
import wsentryalert from "./WorkspaceEntryAlert.vue";
import { setupEntry } from "@/core/utils/WorkspaceUtils";
import WorkspaceViewIfcWrapper from "@/core/utils/WorkspaceViewIfcWrapper";
import { ResizeBottomRight } from "mdue";
import { ResizerComplex } from "@/core/utils/ResizeUtils";
import WorkspaceEntry, { DefaultWorkspaceEntry } from "@/core/model/fileactivity/workspace/WorkspaceEntry";

export default defineComponent({
  el: ".ws-entry",
  components: {
    wsentryalert,
    wsentrydisplayname,
    ResizeBottomRight,
  },
  name: "wsentry",
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: {
      type: DefaultWorkspaceEntry,

      required: true,
    },
    workspace: {
      type: WorkspaceViewIfcWrapper,
      required: true,
    },
  },
  mounted() {
    const entrydiv = this.$el.getElementsByTagName("div")[0];

    entrydiv.classList.add("ws-entry-slot");

    function getStyle(el: HTMLElement, styleProp: string) {
      if (document && document.defaultView) {
        var y = document.defaultView
          .getComputedStyle(el, null)
          .getPropertyValue(styleProp);
        return y;
      }
      return undefined;
    }

    this.$el.style.zIndex = getStyle(entrydiv, "z-index");

    new ResizerComplex(
      this.$el,
      this.$el.getElementsByClassName(
        "ws-entry-resize-button"
      )[0] as HTMLElement,
      this.workspace,
      () => {
        this.workspace.showNearbySelection = false;
        this.workspace.preventInput(true);
      },
      () => {
        this.workspace.updateUI();
      },
      () => {
        this.workspace.showNearbySelection = true;
        this.workspace.preventInput(false);
        this.workspace.updateUI();
      }
    );
  },
  methods: {
    dblclick(e: MouseEvent) { },
  },
});
</script>

<style lang="scss">
.ws-entry-resize-button {
  position: absolute;
  left: 100%;
  top: 100%;
  width: 15px;
  height: 15px;
  background: transparent;
  pointer-events: all;
  cursor: se-resize !important;
  // transition: transform 0.3s ease-out;
  transform-origin: left top;
}

.prevent-input .ws-entry-resize-button {
  pointer-events: none !important;
}

.ws-entry {
  transition: opacity 0.3s ease-in-out;
  position: absolute;
  pointer-events: none;
}

.ws-entry-slot {
  pointer-events: auto;
  position: absolute;
  width: 100%;
  height: 100%;
}

.prevent-input .ws-entry-slot {
  pointer-events: none !important;
}
</style>
 