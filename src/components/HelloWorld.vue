<template>
  <div
    v-on:keyup.enter="toggleShowFiles"
    @click.ctrl="toggleShowFiles"
    @dragover.prevent
    @drop.prevent="dropFiles"
    id="graph"
  ></div>
</template>

<script lang="ts">
const fs = require("fs");
const path = require("path");

import { defineComponent } from "vue";
import ForceGraph, {
  ForceGraphGenericInstance,
  ForceGraphInstance,
  LinkObject,
  NodeObject,
} from "force-graph";
import {
  OverviewNode,
  OverviewData,
  OverviewLink,
} from "../store/OverviewData";
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
    showFiles: boolean;
    overviewData: OverviewData;
    graph: ForceGraphInstance | undefined;
  } {
    return {
      showFiles: true,
      overviewData: new OverviewData(),
      graph: undefined,
    };
  },
  methods: {
    dropFiles(e: any) {
      let droppedFiles = e.dataTransfer.files;
      if (!droppedFiles) return;
      // this tip, convert FileList to array, credit: https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/

      function getFiles(dir: string, parent: OverviewNode) {
        const files = fs.readdirSync(dir);
        files.forEach((file: any) => {
          const filePath = path.join(dir, file);
          const fileStat = fs.lstatSync(filePath);

          let child: OverviewNode = new OverviewNode(filePath);
          child.isDirectory = fileStat.isDirectory();
          child.name = file;
          child.path = dir;
          child.parent = parent;
          child.depthCalc();

          var fileSizeInBytes = fileStat.size;
          // Convert the file size to megabytes (optional)
          parent.size = Math.sqrt(fileSizeInBytes / (1024 * 1024));
          parent.children.push(child);

          if (child.isDirectory) {
            getFiles(filePath, child);
          }
        });
      }
      let rootFile: OverviewNode = new OverviewNode(droppedFiles[0].path);
      rootFile.name = "root";
      rootFile.path = droppedFiles[0].path;
      getFiles(droppedFiles[0].path, rootFile);

      if (this.graph != undefined) {
        let rootNode: HierarchyNode<OverviewNode> =
          d3.hierarchy<OverviewNode>(rootFile);

        let nodes: HierarchyNode<OverviewNode>[] = rootNode.descendants();
        let links: HierarchyLink<OverviewNode>[] = rootNode.links();

        let maxDepth: number = Math.max.apply(
          Math,
          nodes.map(function (o: HierarchyNode<OverviewNode>) {
            return o.data.depth;
          })
        );
        let vm = this;
        for (let i = 0; i <= maxDepth; i++) {
          (function (ind) {
            setTimeout(function () {
              let nodesSub: HierarchyNode<OverviewNode>[] = nodes.filter(
                (o: HierarchyNode<OverviewNode>) => o.data.depth == i
              );
              let linksSub: HierarchyLink<OverviewNode>[] = links.filter(
                (o: HierarchyLink<OverviewNode>) => o.target.depth == i
              );

              globalData.nodes.push(...nodesSub.map((n) => n.data));

              console.log("anzahl nodes:");
              console.log(globalData.nodes.length);

              let linksF: OverviewLink[] = [];
              linksSub.forEach((l: HierarchyLink<OverviewNode>) => {
                let link = new OverviewLink();
                link;
                linksF.push({
                  source: l.source.data,
                  target: l.target.data,
                });
              });

              globalData.links.push(...linksF);
              /**
               * Füge die neuen Dateien/Ordner der OverviewData hinzu und aktualisiere den ForceGraph.
               */
              if (vm.graph != undefined) {
                vm.graph.graphData(globalData);
              }
            }, 0 + 200 * ind);
          })(i);
        }
      }
      // ipcRenderer.send("file-drop", droppedFiles[0].path);
    },
    toggleShowFiles() {
      this.showFiles = !this.showFiles;
    },
    nodePaint(
      node: OverviewNode,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ): void {
      if (node != undefined) {
        const getColor = (n: OverviewNode) =>
          "#" +
          ((n.size * 1234567) % Math.pow(2, 24)).toString(16).padStart(6, "0");
        let alpha = 1.0 - node.depth * 0.05;
        // ctx.fillStyle = "rgba(131, 120, 100, " + alpha + ")";
        // Draw wider nodes by 1px on shadow canvas for more precise hovering (due to boundary anti-aliasing)
        const r = Math.sqrt(Math.max(0, node.children.length || 1)) * 4 + 0;
        ctx.beginPath();
        ctx.arc(
          node.x != undefined ? node.x : 0,
          node.y != undefined ? node.y : 0,
          r,
          0,
          2 * Math.PI,
          false
        );
        ctx.fillStyle = "rgba(131, 220, 180, " + alpha + ")";
        ctx.fill();
      }
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

          let links: HierarchyLink<OverviewNode>[] = rootNode.links();
          let nodes: HierarchyNode<OverviewNode>[] = rootNode.descendants();

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
          /**
           * Füge die neuen Dateien/Ordner der OverviewData hinzu und aktualisiere den ForceGraph.
           */
          vm.graph.graphData(globalData);
        }
      }
    );

    console.log("start!");

    let div: HTMLElement | null = document.getElementById("graph");

    if (div !== null) {
      interface test {
        x: number;
      }

      this.graph = ForceGraph()(div)
        // .linkDirectionalParticles(2)
        .linkWidth(2)
        .minZoom(0.1)
        .maxZoom(10)
        .nodeVisibility(function (n: NodeObject) {
          let node = n as OverviewNode;
          return vm.showFiles || node.isDirectory;
        })
        .linkVisibility(function (n: LinkObject) {
          let s = n.source as OverviewNode;
          let t = n.target as OverviewNode;
          return vm.showFiles || t.isDirectory;
        })
        .backgroundColor("#333")
        // .cooldownTime(100)
        .nodeRelSize(4)
        .nodeVal((n: any) => n.children.length)
        .nodeCanvasObject(function (
          node: NodeObject,
          ctx: CanvasRenderingContext2D,
          globalScale: number
        ): void {
          vm.nodePaint(node as OverviewNode, ctx, globalScale);
        })
        .graphData(globalData);

      // @ts-ignore: Unreachable code error
      // let force = this.graph.d3Force("link", null);
      // @ts-ignore: Unreachable code error
      //this.graph.d3Force("center", null);
      // @ts-ignore: Unreachable code error
      // let charge = this.graph.d3Force("charge", null);
      this.graph.d3Force("collision", d3.forceCollide(6));

      let charge = this.graph.d3Force("charge");
      if (charge != null) {
        charge.distanceMax(1500);
        charge.distanceMin(100);
      }
      //  if (force != null) {
      //     // force.distance(function (l: any) {
      //     //   return 2;
      //     // });
      //   }
    }
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
* {
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
