<template>
  <div @dragover.prevent @drop.prevent="dropFiles" id="graph"></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ForceGraph, {
  ForceGraphGenericInstance,
  ForceGraphInstance,
} from "force-graph";
import { OverviewNode, OverviewData, OverviewLink } from "@/store/OverviewData";
import * as d3 from "d3";
import {
  D3DragEvent,
  HierarchyLink,
  HierarchyNode,
  SimulationNodeDatum,
  ZoomView,
} from "d3";

const { ipcRenderer } = require("electron");

const globalData: OverviewData = new OverviewData();

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
        if (vm.graph != undefined) {
          let rootNode: HierarchyNode<OverviewNode> =
            d3.hierarchy<OverviewNode>(rootFile);
          console.log("  d3.hierarchy");

          let links: HierarchyLink<OverviewNode>[] = rootNode.links();
          let nodes: HierarchyNode<OverviewNode>[] = rootNode.descendants();

          // nodes = nodes.filter((n) => n.data.isDirectory);
          // links = links.filter(
          //   (l) => l.target.data.isDirectory && l.source.data.isDirectory
          // );

          globalData.nodes.push(...nodes.map((n) => n.data));

          console.log("anzahl nodes:");
          console.log(globalData.nodes.length);

          let linksF: OverviewLink[] = [];
          links.forEach((l: HierarchyLink<OverviewNode>) => {
            let link = new OverviewLink();
            link;
            linksF.push({
              source: l.source.data,
              target: l.target.data,
            });
          });

          globalData.links.push(...linksF);
          console.log("vm.overviewData.li");
          /**
           * Füge die neuen Dateien/Ordner der OverviewData hinzu und aktualisiere den ForceGraph.
           */
          vm.graph.graphData(globalData);
          console.log(" vm.graph.graphData(vm.overviewData);");
        }
      }
    );

    console.log("start!");

    // const N = 2300;
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

    // fetch("./blocks.json")
    //   .then((res) => res.json())
    //   .then((data) => {
    //     const elem = document.getElementById("graph");

    //     if (elem !== null) {
    //       const Graph = ForceGraph()(elem)
    //         .backgroundColor("#101020")
    //         .nodeRelSize(6)
    //         .nodeAutoColorBy("user")
    //         .nodeLabel((node: any) => `${node.user}: ${node.description}`)
    //         .linkColor(() => "rgba(255,255,255,0.2)")
    //         .linkDirectionalParticles(1)
    //         .onNodeClick((node: any) =>
    //           window.open(
    //             `https://bl.ocks.org/${node.user}/${node.id}`,
    //             "_blank"
    //           )
    //         )
    //         .graphData(data);
    //     }
    //   });

    if (div !== null) {
      this.graph = ForceGraph()(div)
        // .linkDirectionalParticles(2)
        // .graphData(gData);
        .linkWidth(3)
        .minZoom(0.1)
        .maxZoom(10)
        .backgroundColor("#ddd")
        // .cooldownTime(100)
        .nodeRelSize(4)
        .nodeVal((n: any) => n.children.length)

        // .linkCurvature(0.7)
        //.dagMode('radialout')
        .graphData(globalData);

      let force = this.graph.d3Force("link");
      if (force != null) {
        force.distance(function (l: any) {
          return 2;
        });
      }
    }
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
*{
  margin: 0;
  padding: 0;
}
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
