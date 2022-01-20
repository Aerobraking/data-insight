

import 'reflect-metadata';
import { createApp } from 'vue'
import App from './App.vue'
import { initStore, Store } from './store/store'
import panZoom from 'vue-panzoom';
import VueTippy from 'vue-tippy';
import { ipcRenderer } from "electron";
import fs from "fs";
import { deserialize } from 'class-transformer';
import { InsightFile } from './store/model/state';
import { Feature } from './store/model/app/overview/AbstractNodeFeature';

/**
 * Workspace Entries
 */
import wsentryframe from "./components/app/WorkspaceEntryFrame.vue";

/**
 * Workspace Folder Entries
 */
import wsentryfile from "./components/implementations/WorkspaceEntryFileView.vue";
import wsentrytextarea from "./components/implementations/WorkspaceEntryTextareaView.vue";
import wsentryfolderview from "./components/implementations/WorkspaceEntryFolderView.vue";
import wsentryimage from "./components/implementations/WorkspaceEntryImageView.vue";
import wsentryvideo from "./components/implementations/WorkspaceEntryVideoView.vue";
import wsentryyoutube from "./components/implementations/WorkspaceEntryYoutubeView.vue";

/**
 * Features
 */
import featurenone from "./components/implementations/features/FeatureNone.vue";
import featuresize from "./components/implementations/features/FeatureSizeComp.vue";

ipcRenderer.send("show-window");

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

ipcRenderer.send("get-args", {});

function startApp(store: Store) {


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
                delay: [1050, 400],
                interactiveDebounce: 1,
                interactiveBorder: 10,
            },
        })
        .use(store)
        .use(panZoom)
        .mount('#app');

    // workspace entries
    app.component('wsentryfile', wsentryfile);
    app.component('wsentrytextarea', wsentrytextarea);
    app.component('wsentryframe', wsentryframe);
    app.component('wsentryfolder', wsentryfolderview);
    app.component('wsentryimage', wsentryimage);
    app.component('wsentryvideo', wsentryvideo);
    app.component('wsentryyoutube', wsentryyoutube);

    // features
    app.component(Feature.None, featurenone);
    app.component(Feature.FolderLastModify, featuresize);
    app.component(Feature.FolderSize, featuresize);
    app.component(Feature.FolderQuantity, featuresize);

}
