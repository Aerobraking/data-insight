<script lang="ts">
import { Workspace } from "../../store/model/Workspace";
import { defineComponent } from "vue"; 

export default defineComponent({
  name: "Nodes",
  components: {
 
  },
  props: {
    model: Workspace,
    viewId: Number,
  },
  methods: {},
  computed: {
     
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
  <keep-alive>
    <component  class="ws-entry"
      v-for="e in model.entries"
      :key="e.id"
      :entry="e"
      :viewId="viewId" 
      v-bind:is="e.componentname"
    >
    </component>
  </keep-alive>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
 
</style>
