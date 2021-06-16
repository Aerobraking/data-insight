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
const chokidar = require("chokidar");

function removeItemOnce<T>(arr: Array<T>, value: T) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

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
    graph: ForceGraphInstance | undefined;
    watchReady: boolean;
    listRootNodes: HierarchyNode<OverviewNode>[];
  } {
    return {
      listRootNodes: [],
      watchReady: false,
      showFiles: false,
      graph: undefined,
    };
  },
  methods: {
    addFile(path: string) {
      for (let r of this.listRootNodes) {
        if (path.includes(r.data.path)) {
          let pathRelative = path.replace(r.data.path, "");

          let pathArray = pathRelative.split("\\");
          let parentNode: OverviewNode | undefined = r.data;

          pathArray = pathArray.filter((p) => p.trim().length > 0);

          for (let i = 0; i < pathArray.length - 1; i++) {
            const element = pathArray[i];

            if (parentNode != undefined) {
              let node: OverviewNode | undefined = parentNode.children.find(
                (n) => n.path.endsWith(element)
              );

              parentNode = node;
            }
          }

          if (parentNode?.path.endsWith(path)) {
            /**
             * file already exists as node
             */
            return;
          }

          this.addData(parentNode, path);
        }
      }
    },
    removeFile(path: string) {
      for (let r of this.listRootNodes) {
        if (path.includes(r.data.path)) {
          let pathRelative = path.replace(r.data.path, "");

          let pathArray = pathRelative.split("\\");
          pathArray = pathArray.filter((p) => p.trim().length > 0);
          let currentNode: OverviewNode | undefined = r.data;
          for (let i = 0; i < pathArray.length; i++) {
            const element = pathArray[i];

            if (currentNode != undefined) {
              let node: OverviewNode | undefined = currentNode.children.find(
                (n) => n.path.endsWith(element)
              );

              currentNode = node;
              // if (i == pathArray.length - 1) {
              // } else {
              //   currentNode = node;
              // }
            }
          }
          if (currentNode != undefined) {
            /**
             * remove node
             */
            if (currentNode.parent != undefined) {
              removeItemOnce(currentNode.parent.children, currentNode);
            }
            let a = globalData.nodes.find((n) => n.path === currentNode?.path);
            removeItemOnce(globalData.nodes, a);

            /**
             * remove link
             */
            let link = globalData.links.find((l) => l.target == a);
            if (link != undefined) {
              removeItemOnce(globalData.links, link);
            }
          }

          if (this.graph != undefined) {
            this.graph.graphData(globalData);
          }
        }
      }
    },
    removeFolder(path: string) {},

    addFolder(path: string) {},
    addData(parent: OverviewNode | undefined, pathRoot: string) {
      function getFiles(dir: string, parent: OverviewNode, hue: number = 0) {
        const files = fs.readdirSync(dir);
        let index = 0;

        files.forEach((file: any) => {
          const filePath = path.join(dir, file);
          const fileStat = fs.lstatSync(filePath);

          let child: OverviewNode = new OverviewNode(filePath);
          child.isDirectory = fileStat.isDirectory();
          child.name = file;
          child.path = filePath;
          child.parent = parent;
          child.depthCalc();

          if (child.depth == 1 && child.isDirectory) {
            hue = (360 / files.length) * index;
          }
          child.hue = hue;

          var fileSizeInBytes = fileStat.size;
          // Convert the file size to megabytes (optional)
          parent.size = Math.sqrt(fileSizeInBytes / (1024 * 1024));
          parent.children.push(child);

          if (child.isDirectory) {
            getFiles(filePath, child, hue);
          }
          index++;
        });
      }

      let rootFile: OverviewNode = new OverviewNode(pathRoot);
      if (parent != undefined) {
        rootFile.parent = parent;
      }

      rootFile.name = pathRoot.split("\\")[pathRoot.split("\\").length - 1];
      rootFile.path = pathRoot;
      rootFile.depthCalc();
      rootFile.isDirectory = fs.lstatSync(rootFile.path).isDirectory();

      if (rootFile.isDirectory) {
        getFiles(pathRoot, rootFile);
      }

      let vm = this;

      /**
       * füge file watching hinzu
       */
      if (parent == undefined) {
        const watcher = chokidar.watch(rootFile.path, {
          ignored: /(^|[\/\\])\../, // ignore dotfiles
          persistent: true,
          recursive: true,
        });

        vm.watchReady = false;
        watcher
          .on("add", (path: any) => {
            if (vm.watchReady) {
              this.addFile(path);
              console.log("add file: " + path);
            }
          })
          .on("change", (path: any) => {
            console.log(path);
          })
          .on("unlink", (path: any) => {
            if (vm.watchReady) {
              this.removeFile(path);
              console.log("remove file: " + path);
            }
          })
          .on("addDir", (path: any) => {
            if (vm.watchReady) {
              this.addFile(path);
              console.log("add Dir: " + path);
            }
          })
          .on("ready", (path: any) => {
            vm.watchReady = true;
            console.log("READY");
          })
          .on("unlinkDir", (path: any) => {
            console.log("remove Dir: " + path);
            this.removeFile(path);
          });
      }

      if (this.graph != undefined) {
        /**
         * Wenn wir einen parent mitbekommen haben, nutzen wir den als root. Damit wird auch der link von diesem zum neuen child erstellt
         */
        let rootNode: HierarchyNode<OverviewNode> =
          d3.hierarchy<OverviewNode>(rootFile);

        if (parent == undefined) {
          vm.listRootNodes.push(rootNode);
        }

        let nodes: HierarchyNode<OverviewNode>[] = rootNode.descendants();

        let links: HierarchyLink<OverviewNode>[] = rootNode.links();

        let maxDepth: number = Math.max.apply(
          Math,
          nodes.map(function (o: HierarchyNode<OverviewNode>) {
            return o.data.depth;
          })
        );

        /**
         * wenn wir ein parent haben, starten wir bei der depth eins unter ihm, also der seiner children.
         */
        for (
          let i = parent != undefined ? parent.depth + 1 : 0, j = 0;
          i <= maxDepth;
          i++, j++
        ) {
          (function (depth, index) {
            setTimeout(function () {
              let nodesSub: HierarchyNode<OverviewNode>[] = nodes.filter(
                (o: HierarchyNode<OverviewNode>) => o.data.depth == depth
              );
              let linksSub: HierarchyLink<OverviewNode>[] = links.filter(
                (o: HierarchyLink<OverviewNode>) => o.target.depth == depth
              );

              globalData.nodes.push(...nodesSub.map((n) => n.data));

              console.log("anzahl nodes:");
              console.log(globalData.nodes.length);

              let linksF: OverviewLink[] = [];
              linksSub.forEach((l: HierarchyLink<OverviewNode>) => {
                let link = new OverviewLink();
                link.source = l.source.data;
                link.target = l.target.data;
                linksF.push(link);
              });

              /**
               * Wenn wir nen parent haben, erstelle den link vom neuen child zu dem parent.
               */
              if (j == 0 && parent != undefined) {
                linksF.push({
                  source: parent,
                  target: rootFile,
                });
              }

              globalData.links.push(...linksF);
              /**
               * Füge die neuen Dateien/Ordner der OverviewData hinzu und aktualisiere den ForceGraph.
               */
              if (vm.graph != undefined) {
                vm.graph.graphData(globalData);
              }
            }, 0 + 300 + Math.pow(index + 5, 2) * 15);
          })(i, j);
        }
      }
    },
    dropFiles(e: any) {
      let droppedFiles = e.dataTransfer.files;
      if (!droppedFiles) return;
      // this tip, convert FileList to array, credit: https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/
      this.addData(undefined, droppedFiles[0].path);
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
        ctx.fillStyle = node.getHSL();
        ctx.fill();
      }
    },
  },
  mounted() {
    let vm = this;
    ipcRenderer.on(
      "files-added",
      function (event: any, rootFile: OverviewNode) {
        // if (vm.graph != undefined) {
        //   let rootNode: HierarchyNode<OverviewNode> =
        //     d3.hierarchy<OverviewNode>(rootFile);
        //   let links: HierarchyLink<OverviewNode>[] = rootNode.links();
        //   let nodes: HierarchyNode<OverviewNode>[] = rootNode.descendants();
        //   globalData.nodes.push(...nodes.map((n) => n.data));
        //   console.log("anzahl nodes:");
        //   console.log(globalData.nodes.length);
        //   let linksF: OverviewLink[] = [];
        //   links.forEach((l: HierarchyLink<OverviewNode>) => {
        //     let link = new OverviewLink();
        //     link;
        //     linksF.push({
        //       source: l.source.data,
        //       target: l.target.data,
        //     });
        //   });
        //   globalData.links.push(...linksF);
        //   /**
        //    * Füge die neuen Dateien/Ordner der OverviewData hinzu und aktualisiere den ForceGraph.
        //    */
        //   vm.graph.graphData(globalData);
        // }
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
       // .nodeLabel((n:OverviewNode)=>n.path)
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
