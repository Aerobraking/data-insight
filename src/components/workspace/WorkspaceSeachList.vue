<script lang="ts">
import { Workspace, WorkspaceEntry } from "../../store/model/Workspace";
import { defineComponent } from "vue";

export default defineComponent({
  name: "wssearchlist",
  components: {},
  props: {
    model: Workspace,
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
    listFound: function (): WorkspaceEntry[] {
      let c = this;
      return c.searchString && c.searchString.trim().length > 0 && this.model
        ? this.model?.entries.filter(function (number) {
            return number.searchLogic(c.searchString ? c.searchString : "");
          })
        : [];
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
  <table>
    <keep-alive>
      <tr
        @mousedown.left.stop
        @mouseup.stop
        @click="goToEntry(false, $event)"
        @dblclick="goToEntry(true, $event)"
        class="search-result-row"
        v-for="e in listFound"
        :name="e.id"
        :key="e.id"
        :entry="e"
        :viewId="model.id"
      >
        <td>{{ e.typename }}</td>
        <td>{{ e.searchResultString() }}</td>
        <td>{{ e.displayname }}</td>
      </tr>
    </keep-alive>
  </table>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
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
    vertical-align: center;
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
  border-top: 1px solid #444;
  white-space: nowrap;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  border-spacing: 0;
  border: none;
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
  background: #ccc;
}
</style>
