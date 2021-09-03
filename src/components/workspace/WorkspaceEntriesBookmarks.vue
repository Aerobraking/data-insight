<script lang="ts">
const message: string[] = [
  "vue.draggable",
  "draggable",
  "component",
  "for",
  "vue.js 2.0",
  "based",
  "on",
  "Sortablejs",
];

import { Workspace, WorkspaceEntry } from "../../store/model/Workspace";
import { defineComponent } from "vue";
import draggable from "vuedraggable";
import overviewview from "../overview/OverviewView.vue";

export default defineComponent({
  name: "wsentriesbookmarks",
  components: {
    draggable,
    overviewview,
  },
  props: {
    model: {
      type: Workspace,
      required: true,
    },
    viewId: Number,
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
  methods: {
    goToEntry(zoom: boolean, event: any) {
      if (!this.clickTimer) {
        this.clickTimer = setTimeout(() => {
          this.$emit("bookmarkclicked", {
            id: event.target.getAttribute("name"),
            zoom: zoom,
          });
          this.clickTimer = null;
        }, 5); //tolerance in ms
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
  <div class="bookmarks">
    <h3>Bookmarks</h3>

    <draggable
      v-model="myList"
      @start="drag = true"
      @end="drag = false"
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
          v-show="element.displayname.length > 0"
        >
          {{ element.displayname }}
        </a>
      </template>
    </draggable>
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.bookmarks {
  position: absolute;
  left: 10px;
  top: 35px;

  a {
    user-select: none;
  }
  h3 {
    margin: 0;
    padding: 0;
    color: #bbb;
    text-align: left;
    pointer-events: none;
  }
}

.bookmark-entry {
  color: #fff;
  cursor: grab;
  display: table;
  padding-top: 10px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  text-shadow: rgb(0, 0, 0) 0px 0 15px, rgb(0, 0, 0) 0px 0 4px;
}
</style>
