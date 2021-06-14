<template>
  <div @dragover.prevent @drop.prevent="dropFiles" id="graph"></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ForceGraph, {
  ForceGraphGenericInstance,
  ForceGraphInstance,
} from "force-graph";
import { OverviewNode, OverviewData } from "@/store/OverviewData";

const { ipcRenderer } = require("electron");

export default defineComponent({
  name: "HelloWorld",

  data(): {
    overviewData: OverviewData;
    graph: ForceGraphInstance | undefined;
  } {
    return {
      overviewData: new OverviewData(),
      graph: undefined,
    };
  },
  methods: {
    dropFiles(e: any) {
      let droppedFiles = e.dataTransfer.files;
      if (!droppedFiles) return;
      // this tip, convert FileList to array, credit: https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/

      ipcRenderer.send("file-drop", droppedFiles[0].path);
    },
  },
  mounted() {
    let vm = this;
    ipcRenderer.on(
      "files-added",
      function (event: any, rootFile: OverviewNode) {
        debugger;
        if (vm.graph != undefined) {
          vm.overviewData.nodes.push();
          /**
           * Füge die neuen Dateien/Ordner der OverviewData hinzu und aktualisiere den ForceGraph.
           */
          vm.graph.graphData(vm.overviewData);
        }
      }
    );

    console.log("start!");

    // const N = 300;
    // const gData = {
    //   nodes: [...Array(N).keys()].map((i) => ({ id: i })),
    //   links: [...Array(N).keys()]
    //     .filter((id) => id)
    //     .map((id) => ({
    //       source: id,
    //       target: Math.round(Math.random() * (id - 1)),
    //     })),
    // };

    let div: HTMLElement | null = document.getElementById("graph");

    if (div !== null) {
      this.graph = ForceGraph()(div)
        .linkDirectionalParticles(2)
        .graphData(this.$data.overviewData);
    }
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
#graph {
  position: absolute;
  width: 100%;
  height: 100%;
}
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
