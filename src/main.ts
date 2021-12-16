import 'reflect-metadata';
import { createApp } from 'vue'
import App from './App.vue'
import { store } from './store/store'
import panZoom from 'vue-panzoom';
import  VueTippy from 'vue-tippy';

import wsentryfile from "./components/workspace/WorkspaceEntryFileView.vue";
import wsentryframe from "./components/workspace/WorkspaceEntryFrame.vue";
import wsentrytextarea from "./components/workspace/WorkspaceEntryTextareaView.vue";
import wsentryfolderview from "./components/workspace/WorkspaceEntryFolderView.vue";
import wsentryimage from "./components/workspace/WorkspaceEntryImageView.vue";
import wsentryyoutube from "./components/workspace/WorkspaceEntryYoutubeView.vue";

const app = createApp(App);
app
    .use(VueTippy, { 
        directive: 'tippy', // => v-tippy
        component: 'tippy', // => <tippy/>
        componentSingleton: 'tippy-singleton', // => <tippy-singleton/>,    
        defaultProps: {
            placement: 'top',  
            allowHTML: true,
            animation: 'fade',
            delay: [1050,400],
            interactiveDebounce: 1,
            interactiveBorder: 10, 
        },  
    })
    .use(store)
    .use(panZoom)
    .mount('#app');

app.component('wsentryfile', wsentryfile);
app.component('wsentrytextarea', wsentrytextarea);
app.component('wsentryframe', wsentryframe);
app.component('wsentryfolder', wsentryfolderview);
app.component('wsentryimage', wsentryimage);
app.component('wsentryyoutube', wsentryyoutube);
