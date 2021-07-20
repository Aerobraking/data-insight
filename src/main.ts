import { createApp } from 'vue'  
import App from './App.vue'
import { store } from './store/store'
import panZoom from 'vue-panzoom';
import wsentryframe from "./components/workspace/WorkspaceEntryFrame.vue"; 


const app = createApp(App);
app.use(store).use(panZoom).mount('#app');
app.component('wsentryframe', wsentryframe);
    