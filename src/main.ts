import { createApp } from 'vue'
import App from './App.vue'
import { store } from './store/store'
import panZoom from 'vue-panzoom';



export default createApp(App).use(store).use(panZoom).mount('#app');