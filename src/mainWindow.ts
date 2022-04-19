/**
 * This is the main entry point when the app window is created. It starts the Vue Instance,
 * loads the model (a InsightFile Object) and uses it for the Vuex Store.
 * 
 * Here all used Vue components for all workspace entry and feature classes need to be registered like seen below:
    app.component('wsentryfile', wsentryfile);
 * So when you create new WorkspaceEntry or Feature implementations and their coressponding Vue Components, don't forget
 * to register them here. :)
 */

import 'reflect-metadata';
import { createApp } from 'vue'
import App from './core/components/App.vue'
import { initStore, Store } from './core/store/store'
import panZoom from 'vue-panzoom';
import VueTippy from 'vue-tippy';
import { ipcRenderer } from "electron";
import fs from "fs";
import { deserialize } from 'class-transformer';
import { InsightFile } from './core/model/InsightFile';
import { FeatureType } from './core/model/workspace/overview/FeatureType';

/**
 * Workspace Entry Components
 */
import wsentryframe from "./core/components/workspace/WorkspaceEntry/WorkspaceEntryFrame.vue";

/**
 * EXTEND APP
 * 
 * Workspace Folder Entry Components
 */
import wsentryfile from "./filesystem/components/WorkspaceEntryFileView.vue";
import wsentrytextarea from "./filesystem/components/WorkspaceEntryTextareaView.vue";
import wsentryfolderview from "./filesystem/components/WorkspaceEntryFolderView.vue";
import wsentryimage from "./filesystem/components/WorkspaceEntryImageView.vue";
import wsentryvideo from "./filesystem/components/WorkspaceEntryVideoView.vue";
import wsentryyoutube from "./filesystem/components/WorkspaceEntryYoutubeView.vue";

/**
 * EXTEND APP
 * 
 * Feature Components
 */
import featurenone from "./core/components/features/FeatureNone.vue";
import featuresize from "./core/components/features/FeatureSizeComp.vue";

/**
 * Triggers the main Thread to set the apps window to visible. This way
 * The window will be shown when it's content is already loaded.
 */
ipcRenderer.send("show-window");

/**
 * The arguments from the background thread can contain a path to a file, when the app is opened
 * from a Data Insight File. It loads the InsightFile Object from the file and starts the view with it.
 * Otherwise the argument list is empty or contains a non existing file, which
 * then leads to the creation of an empty InsightFile Instance for the view.
 */
ipcRenderer.on("send-args", (event: any, args: string[]) => {
    for (let i = 0; i < args.length; i++) {
        const a = args[i];

        try {
            if (fs.existsSync(a) && a.endsWith(".ins")) {
                // file to load exists
                let jsonString = fs.readFileSync(a, "utf8");
                let file: InsightFile = deserialize(InsightFile, jsonString);
                file.initAfterLoading();
                let store = initStore(file);
                startApp(store);
                return;
            }
        } catch (err) {
            console.error(err);
        }
    }

    let store = initStore(new InsightFile());
    startApp(store);
});

// ask the background thread for file arguments.
ipcRenderer.send("get-args", {});

/**
 * Creates a Vue Instance which will initiliaze the view based on the given store object.
 * @param store The store object that is set to the vue instance. 
 */
function startApp(store: Store) {

    const app = createApp(App);
    app.use(VueTippy, {
        directive: 'tippy', // => v-tippy
        component: 'tippy', // => <tippy/>
        componentSingleton: 'tippy-singleton', // => <tippy-singleton/>,    
        defaultProps: {
            placement: 'top',
            allowHTML: true,
            animation: 'fade',
            delay: [1050, 400],
            interactiveDebounce: 1,
            interactiveBorder: 10,
        },
    })
        .use(store)
        .use(panZoom)
        .mount('#app');

    /**
     * EXTEND APP
     * 
     * register all workspace entry components
     */
    app.component('wsentryfile', wsentryfile);
    app.component('wsentrytextarea', wsentrytextarea);
    app.component('wsentryframe', wsentryframe);
    app.component('wsentryfolder', wsentryfolderview);
    app.component('wsentryimage', wsentryimage);
    app.component('wsentryvideo', wsentryvideo);
    app.component('wsentryyoutube', wsentryyoutube);

    /**
    * EXTEND APP
    * 
    * register all features components
    */
    app.component(FeatureType.None, featurenone);
    app.component(FeatureType.FolderLastModify, featuresize);
    app.component(FeatureType.FolderSize, featuresize);
    app.component(FeatureType.FolderQuantity, featuresize);

}
