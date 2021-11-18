
<template>
  <button
    class="tab-collapse"
    @click="isCollapsed = toggleShowUI()"
    :class="{ 'tab-collapse-true': !getShowUI }"
  >
    <ArrowCollapseUp />
  </button>

  <div
    id="tabs"
    class="tabs-header"
    v-show="getShowUI"
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
          :key="element.key"
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
    </draggable> -->

    <!-- Version without dragging -->
    <div
      v-for="(element, index) in getlist"
      :key="element.key"
      class="tab-entry close-file-anim"
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
      <a class="delete" v-show="element.isActive" @click.self="deleteTab(index)"
        >X</a
      >
    </div>
  </div>

  <workspaceview
    v-for="(view, index) in getlist"
    @click="selectTab(index)"
    :key="view.key"
    v-show="view.isActive"
    :model="view"
  >
  </workspaceview>
</template>


<script lang="ts">
/*
   <overviewview :model="view" v-else-if="view.type === 'overview'">
      </overviewview>
*/
import { defineComponent } from "vue";
import Startscreen from "./StartScreen.vue";
import workspaceview from "../workspace/WorkspaceView.vue";
import overviewview from "../overview/OverviewView.vue";
import { MutationTypes } from "@/store/mutations/mutation-types";
import draggable from "vuedraggable";
import _ from "underscore";
import { WorkspaceViewIfc } from "../workspace/WorkspaceUtils";
import * as WSUtils from "./../workspace/WorkspaceUtils";

import { ArrowCollapseUp } from "mdue";
_.once(() => {
  WSUtils.Events.registerCallback({
    zoom(transform: { x: number; y: number; scale: number }): void {},
    dragStarting(selection: Element[], workspace: WorkspaceViewIfc): void {},
    prepareFileSaving(): void {},
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
    overviewview,
    Startscreen,
  },
  data(): {} {
    return {
      isCollapsed: false,
      selectedIndex: 0,
      drag: false,
    };
  },
  computed: {
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

    getViewList() {
      return this.$store.getters.getViewList;
    },
    dragOptions() {
      return {
        animation: 150,
        group: "description",
        disabled: false,
        ghostClass: "ghost",
        direction: "horizontal",
      };
    },
    getShowUI(): boolean {
      return this.$store.getters.getShowUI;
    },
  },
  methods: {
    toggleShowUI() {
      // @ts-ignore: Unreachable code error
      let show = !this.$store.getters.getShowUI;
      this.$store.commit(MutationTypes.SHOW_UI, {
        showUI: show,
      });
    },
    scrollList(e: WheelEvent) {
      e.preventDefault();
      this.$el.scrollLeft += e.deltaY;
    },
    edit(e: MouseEvent) {
      let input: HTMLInputElement = e.target as HTMLInputElement;
      input.readOnly = false;
      input.select();
      e.preventDefault();
    },
    editFinish(e: KeyboardEvent) {
      let input: HTMLInputElement = e.target as HTMLInputElement;
      input.readOnly = true;
      e.preventDefault();
    },
    createWorkspaceTab() {
      this.$store.commit(MutationTypes.CREATE_WORKSPACE);
    },
    createOverviewTab() {
      this.$store.commit(MutationTypes.CREATE_OVERVIEW);
    },
    selectTab(i: number) {
      this.$store.commit(MutationTypes.SELECT_WORKSPACE, { index: i });
    },
    copyTab(i: number) {
      this.$store.commit(MutationTypes.COPY_WORKSPACE, { index: i });
    },
    deleteTab(i: number) {
      this.$store.commit(MutationTypes.DELETE_WORKSPACE, { index: i });
    },
    dragMouseMove: function (e: MouseEvent) {},

    beforeMouseDownHandler(e: any) {},
  },
});
</script>



<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.tab-collapse {
  outline: none;
  color: white;
  border: none;
  padding: 0;
  margin: 0;
  background-color: transparent;
  transition: all 0.2s ease-in-out;
  position: absolute;
  right: 0px;
  top: 0px;
  z-index: 999;

  svg {
    font-size: 24px;
    padding: 9px;
    margin: 0;
  }
}

.tab-collapse-true {
  transform: rotate(180deg);
  svg {
    color: rgba(255, 255, 255, 0.089);
  }
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
  transition: all 0.3s;
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
  transition: all 0.3s;
}
.tab-entry:hover .delete {
  display: block;
}
.delete:hover {
  background-color: #808080;
}
.tab-entry:hover .copy {
  display: block;
}
.copy:hover {
  background-color: #808080;
}

div.tabs-header {
  display: block;
  margin: 0 0 0 0px;
  padding: 0;
  z-index: 100;
  background-color: rgb(100, 100, 100);
  position: relative;
  width: 100%;
  height: 42px;
  overflow: hidden;
  overflow-x: hidden;
  white-space: nowrap;
}

.close-file {
  opacity: 0;
  transform: translateX(-250px);
  transition: all 0.25s;
}

.tab-create {
  color: #fff;
  width: 10px !important;
  user-select: none;
}

.tab-entry {
  width: 160px;
  border: none;
  display: inline-block;
  outline: 0;
  padding: 10px 15px 0px 15px;
  height: 25px;
  border: none;
  border-radius: 5px;
  margin: 5px 0px 0 6px;
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
    top: 4px;
    font-size: 22px;
  }

  &:hover {
    background-color: rgb(83, 83, 83);
  }
}

.tab-selected {
  color: lavender;
  border-radius: 5px 5px 0 0;
  background-color: rgb(36, 36, 36) !important;
  box-shadow: 4px;
}

@keyframes slide-up {
  0% {
    opacity: 0;
    transform: translateX(-250px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
