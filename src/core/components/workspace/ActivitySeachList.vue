<script lang="ts">
/**
 * This Component represents the search list
 */
import { AbstractNode } from "@/core/model/fileactivity/overview/AbstractNode";
import { AbstractNodeTree } from "@/core/model/fileactivity/overview/AbstractNodeTree";
import { Instance } from "@/core/model/fileactivity/overview/OverviewDataCache";
import { FileActivity } from "@/core/model/fileactivity/FileActivity";
import WorkspaceEntry from "@/core/model/fileactivity/workspace/WorkspaceEntry";
import { defineComponent } from "vue";

export default defineComponent({
  name: "activitysearchlist",
  components: {},
  props: {
    model: {
      type: FileActivity,
      required: true,
    },
    searchString: String,
    viewId: Number,
  },
  data(): {
    clickTimer: any;
  } {
    return {
      clickTimer: null,
    };
  },
  methods: {
    goToEntry(
      zoom: boolean,
      evt: MouseEvent,
      e: WorkspaceEntry | AbstractNode
    ) {
      const move = 80;

      if (e instanceof WorkspaceEntry) {
        if (!this.clickTimer) {
          this.clickTimer = setTimeout(() => {
            this.$emit("bookmarkclicked", {
              id:
                evt.target && evt.target instanceof HTMLElement
                  ? evt.target.getAttribute("name")
                  : 0,
              zoom: zoom,
            });
            this.clickTimer = null;
          }, 5); //tolerance in ms
        } else {
          clearTimeout(this.clickTimer);
          this.clickTimer = null;
          this.$emit("bookmarkclicked", {
            id:
              evt.target && evt.target instanceof HTMLElement
                ? evt.target.getAttribute("name")
                : 0,
            zoom: zoom,
          });
        }

        if (this.model.paneSize < 100 - move) {
          this.model.paneSize = 100;
        }
      } else if (e instanceof AbstractNode) {
        const engine = Instance.getEngine(this.model.id);

        if (!this.clickTimer) {
          this.clickTimer = setTimeout(() => {
            engine.setView(zoom ? 0.777 : undefined, e.x, e.y, 400);
          }, 5);
        } else {
          clearTimeout(this.clickTimer);
          this.clickTimer = null;
          engine.setView(zoom ? 0.777 : undefined, e.x, e.y, 400);
        }

        if (this.model.paneSize > move) {
          this.model.paneSize = 0;
        }
      }
    },
  },
  computed: {
    listFound: function (): (WorkspaceEntry | AbstractNode)[] {
      let _this = this;

      if (
        _this.searchString &&
        _this.searchString.trim().length > 0 &&
        this.model
      ) {
        const s = _this.searchString.toLowerCase();

        const list: (WorkspaceEntry | AbstractNode)[] = [];

        list.push(
          ...this.model.workspace.entries.filter(function (n) {
            return n.searchLogic(s);
          })
        );

        let listEntries: AbstractNodeTree[] = Instance.getData(this.model.id);

        for (let i = 0; i < listEntries.length; i++) {
          const e = listEntries[i];

          for (let j = 0; j < e.nodes.length; j++) {
            const n = e.nodes[j];
            if (n.name.toLowerCase().includes(s)) {
              list.push(n);
            }
          }
        }

        list.sort((a, b) => {
          const s1 =
            a instanceof WorkspaceEntry
              ? a.typeNameReadable + a.searchResultString()
              : a instanceof AbstractNode
              ? "node" + a.getPath(false)
              : "";
          const s2 =
            b instanceof WorkspaceEntry
              ? b.typeNameReadable + b.searchResultString()
              : b instanceof AbstractNode
              ? "node" + b.getPath(false)
              : "";

          return s1.localeCompare(s2);
        });

        return list;
      } else {
        return [];
      }
    },
  },
});
</script>
 
<template>
  <table>
    <keep-alive>
      <tr
        @mousedown.left.stop
        @mouseup.stop
        v-for="e in listFound"
        @click="goToEntry(false, $event, e)"
        @dblclick="goToEntry(true, $event, e)"
        class="search-result-row"
        :name="e.id"
        :key="e.id"
        :viewId="e.id"
      >
        <template v-if="e.width != undefined">
          <td>{{ e.typeNameReadable }}</td>
          <td>{{ e.searchResultString() }}</td>
          <td>{{ e.displayname }}</td>
        </template>
        <template v-else>
          <td>{{ "Node" }}</td>
          <td>{{ e.getPath(false) }}</td>
          <td>{{ e.tree.root.name }}</td>
        </template>
      </tr>
    </keep-alive>
  </table>
</template>
 
<style scoped lang="scss">
table {
  td {
    width: 100%;
    pointer-events: none;
  }
  td:nth-child(1) {
    text-align: left;
    width: 10%;
    font-size: 12px;
    margin-top: 1px;
    vertical-align: bottom;
  }
  td:nth-child(2) {
    text-align: left;
    font-weight: bold;
  }
  td:nth-child(3) {
    text-align: right;
    color: #aaa;
  }
  tr {
    min-height: 0;
    margin: 0;
    padding: 10px;
  }
  margin: 0;
  padding: 0;
  white-space: nowrap;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  border-spacing: 0;
  border: none;
  pointer-events: all;
}

.search-result-row {
  user-select: none;
  cursor: pointer;
  display: table;
  padding-top: 10px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  transition: background-color 0.3s;
}

.search-result-row:hover {
  background: rgb(94, 94, 94);
}
</style>
