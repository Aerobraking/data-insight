<script lang="ts">
import { Workspace, WorkspaceEntry } from "../../store/model/Workspace";
import { defineComponent } from "vue";

export default defineComponent({
  name: "wsentriesbookmarks",
  components: {},
  props: {
    model: Workspace,
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
    goToEntry(event: any) {
      if (!this.clickTimer) {
        this.clickTimer = setTimeout(() => {
          this.$emit("bookmarkclicked", {
            index: event.target.getAttribute("name"),
            zoom: false,
          });
          this.clickTimer = null;
        }, 5); //tolerance in ms
      } else {
        clearTimeout(this.clickTimer);
        this.clickTimer = null;
        this.$emit("bookmarkclicked", {
          index: event.target.getAttribute("name"),
          zoom: true,
        });
      }
    },
  },
  computed: {
    nonEmptyNames: function (): WorkspaceEntry[] {
      return this.model != undefined
        ? this.model?.entries.filter(function (number) {
            return number.displayname.length > 0;
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
  <div class="bookmarks">
    <h3>Bookmarks</h3>
    <keep-alive>
      <a
        @mousedown.left.stop
        @mouseup.stop
        @click.stop="goToEntry"
        class="ws-entry-bookmark"
        v-for="e,ind in nonEmptyNames"
        :name="model.entries.indexOf(e)"
        :key="e.id"
        :entry="e"
        :viewId="model.id"
      >
        {{(ind+1) + ". "+ e.displayname }}
      </a>
    </keep-alive>
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
  cursor: pointer;
  display: table;
  padding-top: 10px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>
