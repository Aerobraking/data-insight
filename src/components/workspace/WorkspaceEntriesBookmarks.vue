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
export default defineComponent({
  name: "wsentriesbookmarks",
  components: {
    draggable,
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
    list: any[];
  } {
    return {
      list: message.map((name: string, index: number) => {
        return { name, order: index + 1 };
      }),
      clickTimer: null,
      drag: false,
    };
  },
  methods: {
    goToEntry(event: any) {
      if (!this.clickTimer) {
        this.clickTimer = setTimeout(() => {
          this.$emit("bookmarkclicked", {
            id: event.target.getAttribute("name"),
            zoom: false,
          });
          this.clickTimer = null;
        }, 5); //tolerance in ms
      } else {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
        this.$emit("bookmarkclicked", {
          id: event.target.getAttribute("name"),
          zoom: true,
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
        console.log(this.model.entries);
      },
    },
    dragOptions() {
      return {
        animation: 200,
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
          @click.stop="goToEntry"
          class="ws-entry-bookmark"
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
  top: 20%;

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

.ws-entry-bookmark {
  color: #fff;
  cursor: grab;
  display: table;
  padding-top: 10px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  text-shadow: rgb(0, 0, 0) 0px 0 15px,rgb(0, 0, 0) 0px 0 4px;
}
</style>
