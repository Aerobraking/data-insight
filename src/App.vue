<template> 
  <OverviewCanvas  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import OverviewCanvas from './components/OverviewCanvas.vue';

export default defineComponent({
  name: 'App',
  components: {
    OverviewCanvas
  }
});
</script>

<style lang="scss">
body{
margin: 0;
padding: 0;
}
#app {
  font-family: Lato, Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50; 
}
</style>
