
<template>
  <div
    id="tabs"
    class="tabs-header"
    :class="{ 'tab-collapse-true': !getShowUI }"
    @mousewheel="scrollList"
  >
    <div class="tab-entry tab-create" @click="createWorkspaceTab()">
      <p>+</p>
    </div>

    <!-- 
    Dragging of Tabs disabled for the moment, because it there are some 
    rendering problems occuring with it. Needs to be investigated later.
    -->
    <!-- <draggable
      v-model="getlist"
      @start="drag = true"
      @end="drag = false"
      :disabled="true"
      item-key="order"
      v-bind="dragOptions"
      tag="transition-group"
    >
      <template #item="{ element, index }">
        <div
          class="tab-entry close-file-anim"
          :key="element.id"
          :class="{ 'tab-selected': element.isActive }"
          @click="selectTab(index)"
        >
          <input
            @keydown.stop
            @keyup.stop
            @dblclick.self="edit"
            v-on:keyup.enter="editFinish"
            @blur="editFinish"
            readonly="true"
            v-model="element.name"
          />
          <!- <a
            class="copy"
            v-show="element.isActive"
            @click.self="copyTab(index)"
            >C</a
          > ->
          <a
            class="delete"
            v-show="element.isActive"
            @click.self="deleteTab(index)"
            >X</a
          >
        </div>
      </template>
    </draggable>
      dragOptions() {
      return {
        animation: 150,
        group: "description",
        disabled: false,
        ghostClass: "ghost",
        direction: "horizontal",
      };
    },
     -->

    <!-- Version without dragging -->
    <div
      v-for="(element, index) in getlist"
      :key="element.id"
      class="tab-entry close-file-anim"
      :class="{ 'tab-selected': element.isActive }"
      @click="selectTab(index)"
      @dblclick.self="edit"
    >
      <input
        @keydown.stop
        @keyup.stop
        @keyup.enter="$event.target.blur()"
        @dblclick.self="edit"
        v-on:keyup.enter="editFinish"
        @blur="editFinish"
        readonly="true"
        v-model="element.name"
        ondragstart="return false"
        style="pointer-events: none"
      />
      <a class="delete" v-show="element.isActive" @click.self="deleteTab(index)"
        >X</a
      >
    </div>
  </div>
  <workspaceview
    v-for="(view, index) in getlist"
    @click="selectTab(index)"
    :key="view.id"
    v-show="view.isActive"
    :model="view"
  >
  </workspaceview>
</template>

<script lang="ts">
/**
 * This Tab Component handles the top bar with the Workspace Tabs. It updates the view of
 * the current selected workspace when the selection changes.
 */
import { defineComponent } from "vue";
import workspaceview from "./workspace/WorkspaceView.vue";
import { MutationTypes } from "@/core/store/mutation-types";
import draggable from "vuedraggable";
import _ from "underscore";
import * as WSUtils from "@/core/utils/WorkspaceUtils";
import { ArrowCollapseUp, EyeOutline, EyeOffOutline } from "mdue";
import { ipcRenderer } from "electron";
/**
 * When a modal plugin starts we prevent any input for the tabs so the user can not
 * change the workspace while using the plugin.
 */
_.once(() => {
  WSUtils.Events.registerCallback({
    pluginStarted(modal: boolean): void {
      document.getElementById("tabs")?.classList.toggle("prevent-input", modal);
    },
  });
})();

export default defineComponent({
  el: "#tabs",
  name: "Tabs",
  components: {
    draggable,
    ArrowCollapseUp,
    workspaceview,
    EyeOffOutline,
    EyeOutline,
  },
  computed: {
    /**
     * Get/Set the list of views (workspaces) from the state object.
     */
    getlist: {
      get(): any {
        // @ts-ignore: Unreachable code error
        return this.$store.getters.getViewList;
      },
      set(value: any) {
        // @ts-ignore: Unreachable code error
        this.$store.commit(MutationTypes.SORT_WORKSPACES, {
          listWorkspaces: value,
        });
      },
    },
    // getViewList() {
    //   return this.$store.getters.getViewList;
    // },
    getShowUI(): boolean {
      return this.$store.getters.getShowUI;
    },
  },
  mounted() {
    const _this = this;
    ipcRenderer.on(
      "toggle-distract-mode",
      function (event: any, filepath: string) {
        _this.toggleShowUI();
      }
    );
  },
  methods: {
    /**
     * Toggles the distract free mode boolean in the model which updates the view.
     */
    toggleShowUI() {
      let show = !this.$store.getters.getShowUI;
      this.$store.commit(MutationTypes.SHOW_UI, {
        showUI: show,
      });
    },
    /**
     * Should scroll the list of tabs horizontally, doesn not work correctly so far. :/
     */
    scrollList(e: WheelEvent) {
      e.preventDefault();
      this.$el.scrollLeft += e.deltaY;
    },
    /**
     * Make the workspace tab name editable and set the focus to the textfield.
     */
    edit(e: MouseEvent) {
      const div = e.target as HTMLElement;
      let input: HTMLInputElement = div.getElementsByTagName(
        "input"
      )[0] as HTMLInputElement;
      input.style.pointerEvents = "all";
      input.removeAttribute("disabled");
      input.readOnly = false;
      setTimeout(() => {
        input.select();
      }, 50);

      e.preventDefault();
    },
    /**
     * Finish the editing of the workpsace tab by making it uneditable again.
     */
    editFinish(e: KeyboardEvent) {
      let input: HTMLInputElement =
        e.target instanceof HTMLInputElement
          ? e.target
          : ((e.target as HTMLElement).getElementsByTagName(
              "input"
            )[0] as HTMLInputElement);
      input.style.pointerEvents = "none";
      input.readOnly = true;
      e.preventDefault();
    },
    /**
     * Creates a new Workspace and makes it the new active workpsace
     */
    createWorkspaceTab() {
      this.$store.commit(MutationTypes.CREATE_WORKSPACE);
    },
    /**
     * Make the given index the active index
     * @param index the index of the workspace in the view list, is the same as the index of the tab element
     * in the list of tab elements.
     */
    selectTab(index: number) {
      this.$store.commit(MutationTypes.SELECT_WORKSPACE, { index: index });
    },
    /**
     * Create a dublicate of the Workspace for the given index.
     */
    dublicateTab(i: number) {
      this.$store.commit(MutationTypes.COPY_WORKSPACE, { index: i });
    },
    /**
     * Deletes the workspace at the given index.
     */
    deleteTab(i: number) {
      this.$store.commit(MutationTypes.DELETE_WORKSPACE, { index: i });
      this.$store.commit(MutationTypes.SELECT_WORKSPACE, { index: i });
    },
  },
});
</script>
  
<style scoped lang="scss">
$background: #1d1d1d;
$base-color: rgb(100, 100, 100);

.tab-collapse {
  outline: none;
  color: white;
  border: none;
  padding: 0;
  height: 32px;
  margin: 0;
  background-color: $base-color;
  transition: color 0.2s ease-in-out;
  transition-property: width, height, color;
  position: absolute;
  right: 0px;
  top: 0px;
  z-index: 9999;
  opacity: 1;

  svg {
    font-size: 20px;
    padding: 4px;
    padding-top: 6px;
    margin: 0;
  }
}

.tab-collapse-hide {
  opacity: 0.1;
  background-color: transparent;
}

.delete {
  display: none;
  background-color: #9a9a9a00;
  color: #ffffff;
  position: absolute;
  right: 0px;
  padding-right: 4px;
  top: 0;
  z-index: 200;
  height: 100%;
  vertical-align: bottom;
  text-align: center;
  width: 21px;
  margin: 0;
  padding: 0;
  line-height: 34px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.copy {
  display: none;
  background-color: #9a9a9a00;
  color: #ffffff;
  position: absolute;
  right: 22px;
  padding-right: 4px;
  top: 0;
  z-index: 200;
  height: 100%;
  vertical-align: bottom;
  text-align: center;
  width: 21px;
  margin: 0;
  padding: 0;
  line-height: 34px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.delete:hover {
  background-color: #808080;
}

.copy:hover {
  background-color: #808080;
}

.tabs-header {
  display: block;
  margin: 0 0 0 0px;
  padding: 0;
  z-index: 100;
  background-color: $base-color;
  position: relative;
  width: 100%;
  height: 32px;
  overflow: hidden;
  overflow-x: hidden;
  white-space: nowrap;

  transform: none !important;
  transition: height 0.2s ease-in-out;
  &.tab-collapse-true {
    transform: none !important;
    height: 0px;
  }
}

.close-file {
  opacity: 0;
  transform: translateX(-250px);
  transition: transform 0.25s;
}

.tab-create {
  color: #fff;
  width: 0px !important;
  user-select: none;
}

.tab-entry {
  width: 160px;
  border: none;
  display: inline-block;
  outline: 0;
  padding: 8px 15px 0px 15px;
  height: 22px;
  border: none;
  border-radius: 4px;
  margin: 2px 0px 0 3px;
  background-color: rgb(73, 73, 73);
  position: relative;
  cursor: pointer;

  a {
    cursor: pointer;
  }

  input {
    cursor: pointer;
    position: absolute;
    width: 80%;
    user-select: none;
    text-align: left;
    background-color: transparent;
    color: #fff;
    border: none;
    outline: none;

    &:focus {
    }
  }

  p {
    cursor: pointer;
    position: absolute;
    width: auto;
    user-select: none;
    text-align: center;
    background-color: transparent;
    color: #fff;
    border: none;
    margin: 0;
    top: 0px;
    left: 9px;
    font-size: 22px;
  }

  &:hover {
    background-color: rgb(83, 83, 83);
  }
}

.tab-entry:hover .delete {
  display: block;
}
.tab-entry:hover .copy {
  display: block;
}

.tab-selected {
  color: lavender;
  border-radius: 4px 4px 0 0;
  background-color: $background !important;
  box-shadow: 4px;
}

// @keyframes slide-up {
//   0% {
//     opacity: 0;
//     transform: translateX(-250px);
//   }
//   100% {
//     opacity: 1;
//     transform: translateX(0);
//   }
// }
</style>
