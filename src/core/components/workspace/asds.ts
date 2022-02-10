import { WorkspaceEntryImage } from '@/filesystem/model/FileSystemWorkspaceEntries';
import App from './core/components/App.vue'

App.component("Toggle", {
    data: function () {
        return {
            isActive: true
        }
    }, template: "<h1>Toggle: <span :click='isActive=!isActive'>Click Me!</span> </h1>"
})

const image = new WorkspaceEntryImage();
this.$store.commit(MutationTypes.ADD_FILES, {
    model: workspace,
    entries: [listFiles],
  });
