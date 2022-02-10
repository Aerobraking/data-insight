<script lang="ts"> 
import { defineComponent } from "vue";
import draggable from "vuedraggable"; 
import { PlaylistStar } from "mdue";
import { Tippy } from "vue-tippy";
import WorkspaceViewIfc from "./WorkspaceViewIfc"; 
import { PluginAdapter } from "@/core/plugin/AbstractPlugin";
import { Workspace } from "@/core/model/Workspace";

class DragPlugin extends PluginAdapter {
  constructor() {
    super();
  }

  readonly description: string = "Dragging";
  readonly name: string = "Dragging";
  readonly shortcut: string = "";
  public init() {}
}

export default defineComponent({
  name: "wsentriesbookmarks",
  components: {
    draggable,
    Tippy, 
    PlaylistStar,
  },
  props: {
    model: {
      type: Workspace,
      required: true,
    },
    viewId: Number,
    workspace: { type: Object as () => WorkspaceViewIfc },
  },
  data(): {
    clickTimer: any;
    drag: boolean;
  } {
    return {
      clickTimer: null,
      drag: false,
    };
  },
  watch: {
    drag: function (newValue: boolean, oldValue: boolean) {
      newValue
        ? this.workspace?.startPlugin(new DragPlugin())
        : this.workspace?.finishPlugin();
    },
  },
  methods: {
    mousewheel(e: Event) {
      this.workspace?.dispatchEvent(e);
    },
    dragUpdate(isDragging: boolean) {
      this.drag = isDragging;

      isDragging
        ? this.workspace?.startPlugin(new DragPlugin())
        : this.workspace?.finishPlugin();
    },
    toggleUI() {},
    goToEntry(zoom: boolean, event: any) {
      if (!this.clickTimer) {
        this.clickTimer = setTimeout(() => {
          this.$emit("bookmarkclicked", {
            id: event.target.getAttribute("name"),
            zoom: zoom,
          });
          this.clickTimer = null;
        }, 5);
      } else {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
        this.$emit("bookmarkclicked", {
          id: event.target.getAttribute("name"),
          zoom: zoom,
        });
      }
    },
  },
  computed: {
    myList: {
      get(): any {
        return this.model.entries;
      },
      set(value: any) {
        this.model.entries = value;
      },
    },
    dragOptions() {
      return {
        animation: 150,
        group: "description",
        disabled: false,
        ghostClass: "ghost",
      };
    },
  },
});
</script>

 <!-- 
 Wir können ein component machen so: 
  <component v-bind:is="currentTabComponent"></component>
  Und der "currentTabComponent" ist der name der compomente, wie "wsentry" zum beispiel. dann müssen wir die componenten nur hier rein laden und
  vorher in vue definiert haben. 
  Dadurch können wir den component namen einfach im model definieren und er wird hier automatisch gebindet.
  Am besten per enum machen, damit es eindeutig ist!
 
 -->
<template>
  <div
    @mousewheel="mousewheel"
    class="bookmarks"
    :class="{ 'bookmarks-hide': !model.showBookmarks }"
  >
    <tippy :placement="'right'" :offset="[-15, -10]">
      <button>
        <PlaylistStar @click="model.showBookmarks = !model.showBookmarks" />
      </button>
      <template #content>Bookmarks <kbd>Shift</kbd>|<kbd>X Num</kbd></template>
    </tippy>
    <draggable
      v-model="myList"
      @start="dragUpdate(true)"
      @end="dragUpdate(false)"
      item-key="order"
      v-bind="dragOptions"
      tag="transition-group"
    >
      <template #item="{ element }">
        <a
          @mousedown.left.stop
          @mouseup.stop
          @click.stop="goToEntry(false, $event)"
          @dblclick.stop="goToEntry(true, $event)"
          class="bookmark-entry"
          :name="element.id"
          :key="element.order"
          :entry="element"
          :viewId="model.id"
          v-show="model.showBookmarks && element.displayname.length > 0"
        >
          {{
            element.displayname.length > 30
              ? element.displayname.substring(0, 30) + "..."
              : element.displayname
          }}
        </a>
      </template>
    </draggable>
  </div>
</template>
 
<style scoped lang="scss">
.bookmarks {
  position: absolute;
  left: -13px;
  top: -7px;
  z-index: 8000;
  transition: transform 0.2s ease-in-out;
  opacity: 1;
  button {
    outline: none;
    color: white;
    border: none;
    padding: 0;
    margin: 0;
    background-color: transparent;
  }

  button:disabled,
  button[disabled] {
    pointer-events: none;
    color: #ffffff50;
    svg {
      transform: scale(0.7);
    }
  }

  a {
    user-select: none;
  }
  a:before {
    content: "-" !important;
    background-size: cover;
    display: inline-block;
    width: 15px;
  }
  h3 {
    margin: 0;
    padding: 0;
    color: #bbb;
    text-align: left;
    pointer-events: none;
  }
}

.bookmarks-hide {
  opacity: 0.2;
}

.bookmark-entry {
  white-space: nowrap;
  color: #fff;
  cursor: pointer;
  min-width: 150px;
  display: table;
  padding-bottom: 10px;
  padding-left: 25px;
  user-select: none;
  filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.7));
  transform-origin: left center;
  &:hover {
    transform: scale(1.03);
  }
}
</style>
