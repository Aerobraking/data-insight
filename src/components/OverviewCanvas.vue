<template>
  <div
    class="canvas-wrapper"
    @click.ctrl="toggleShowFiles"
    @dragover.prevent
    @drop.prevent="dropFiles"
    id="graph"
  ></div>
</template>

<script lang="ts">
const fs = require("fs");
const path = require("path");
// without "window.", the fsevent module can' be loaded on osx
const chokidar = window.require("chokidar");

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

import { TreeNode, TreeLink, TreeStructure } from "../store/model/FileTree";
import * as d3 from "d3";
import * as _ from "underscore";
import { AbstractNode } from "@/store/model/OverviewDataModel";

function loadImages(sources: Array<string>, callback: Function) {
  var images: Array<any> = [];
  var loadedImages = 0;
  var numImages = 0;
  for (var src in sources) {
    numImages++;
  }
  for (let src in sources) {
    images[src] = new Image();
    images[src].onload = function () {
      if (++loadedImages >= numImages) {
        callback(images);
      }
    };
    images[src].src = sources[src];
  }
}
var images: Array<any> = [];
var imagesLoading: Array<any> = [];
function loadImage(sources: any): HTMLImageElement | null {
  if (images[sources] != undefined) {
    console.log("bild ist schon im cache");
    return images[sources];
  }
  if (imagesLoading[sources] != undefined) {
    return null;
  }

  let img = new Image();
  imagesLoading[sources] = img;
  imagesLoading[sources].onload = function () {
    images[sources] = img;
  };

  imagesLoading[sources].src = sources;
  return null;
}

let listRootNodes: Array<TreeNode> = [];

const { ipcRenderer } = require("electron");
let counter = 0;
//const globalData: OverviewData = new OverviewData();
const globalData: TreeStructure = new TreeStructure();

export default defineComponent({
  name: "OverviewCanvas",
  created: function () {
    window.addEventListener("keyup", this.keyPressed);
  },
  data(): {
    showNames: boolean;
    showImages: boolean;
    showFiles: boolean;
    graph: ForceGraphInstance | undefined;
    watchReady: boolean;
  } {
    return {
      watchReady: false,
      showNames: false,
      showFiles: false,
      showImages: false,
      graph: undefined,
    };
  },
  methods: {
    keyPressed(e: KeyboardEvent) {
      switch (e.key) {
        case "i":
          this.showImages = !this.showImages;
          break;
        case "f":
          this.showFiles = !this.showFiles;
          break;
        case "n":
          this.showNames = !this.showNames;
          break;
        default:
          break;
      }
    },
    addFile(path: string) {
      for (let r of listRootNodes) {
        if (path.includes(r.getPath())) {
          let pathRelative = path.replace(r.getPath(), "");

          let pathArray = pathRelative.split("\\");
          let parentNode: TreeNode | undefined = r;

          pathArray = pathArray.filter((p) => p.trim().length > 0);

          for (let i = 0; i < pathArray.length - 1; i++) {
            const element = pathArray[i];

            if (parentNode != undefined) {
              let node: TreeNode | undefined = parentNode.children.find((n) =>
                n.getPath().endsWith(element)
              );

              parentNode = node;
            }
          }

          if (parentNode?.getPath().endsWith(path)) {
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
      for (let i = 0; i < listRootNodes.length - 1; i++) {
        let r: TreeNode = listRootNodes[i];

        if (path.includes(r.getPath())) {
          let pathRelative = path.replace(r.getPath(), "");

          let pathArray = pathRelative.split("\\");
          pathArray = pathArray.filter((p) => p.trim().length > 0);
          let currentNode: any = r;
          for (let i = 0; i < pathArray.length; i++) {
            const element = pathArray[i];

            if (currentNode != undefined) {
              let node: TreeNode | undefined = currentNode.children.find(
                (n: TreeNode) => n.getPath().endsWith(element)
              );

              currentNode = node;
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
    addData(parent: TreeNode | undefined, pathRoot: string) {
      function getFiles(dir: string, parent: TreeNode, hue: number = 0) {
        const files = fs.readdirSync(dir);
        let index = 0;

        files.forEach((file: any) => {
          const filePath = path.join(dir, file);
          const fileStat = fs.lstatSync(filePath);

          let child: TreeNode = new TreeNode(filePath);
          child.setIsDirectory(fileStat.isDirectory());
          child.name = file;
          child.path = filePath;
          child.parent = parent;
          child.depthCalc();
          if (!child.isDirectory) {
            var fileSizeInBytes = fileStat.size;
            child.size = Math.round(Math.sqrt(fileSizeInBytes / (1024 * 1024)));
          }
          if (child.depth == 1 && child.isDirectory) {
            hue = (360 / files.length) * index;
          }
          child.hue = hue;

          // Convert the file size to megabytes (optional)

          parent.children.push(child);

          if (child.isDirectory()) {
            getFiles(filePath, child, hue);
          }
          index++;
        });
      }

      let rootFile: TreeNode = new TreeNode(pathRoot);
      if (parent != undefined) {
        rootFile.parent = parent;
      }

      rootFile.name = pathRoot.split("\\")[pathRoot.split("\\").length - 1];
      rootFile.path = pathRoot;
      // fixes the position of the root node
      //  rootFile.fx=0;
      // rootFile.fy=0;
      rootFile.depthCalc();
      rootFile.setIsDirectory(fs.lstatSync(rootFile.path).isDirectory());

      if (rootFile.isDirectory()) {
        getFiles(pathRoot, rootFile);
      }

      function calculateSize(root: TreeNode): number {
        let size = 0;
        let folderFound = false;
        root.children.forEach((child: TreeNode) => {
          if (child.isDirectory()) {
            size += calculateSize(child);
            folderFound = true;
          } else {
            size += child.size;
          }
        });
        if (root.isDirectory()) {
          root.size = size;
        }

        return size;
      }

      calculateSize(rootFile);
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
        // let rootNode: HierarchyNode<TreeNode> =
        //   d3.hierarchy<TreeNode>(rootFile);

        // if (parent == undefined) {
        //   vm.listRootNodes.push(rootNode);
        // }

        // let nodes: HierarchyNode<TreeNode>[] = rootNode.descendants();

        // let links: HierarchyLink<TreeNode>[] = rootNode.links();
        let nodes: TreeNode[] = rootFile.descendants();

        let links: TreeLink[] = rootFile.links();

        let maxDepth: number = Math.max.apply(
          Math,
          nodes.map(function (o: TreeNode) {
            return o.depth;
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
              let nodesSub: TreeNode[] = nodes.filter(
                (o: TreeNode) => o.depth == depth
              );
              let linksSub: TreeLink[] = links.filter(
                (o: TreeLink) => o.target.depth == depth
              );

              globalData.nodes.push(...nodesSub.map((n:TreeNode) => n));

              let linksF: TreeLink[] = [];
              linksSub.forEach((l: TreeLink) => {
                let link = new TreeLink(l.source, l.target);
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
            }, 0 + 100 + Math.pow(index + 3, 2) * 15);
          })(i, j);
        }
      }
    },
    dropFiles(e: any) {
      let droppedFiles: Array<any> = e.dataTransfer.files;
      if (!droppedFiles) return;
      // this tip, convert FileList to array, credit: https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/
      let index = 0;
      let vm = this;
      droppedFiles.forEach((f: any) => {
        setTimeout(function () {
          vm.addData(undefined, f.path);
        }, index++ * 400);
      });

      // ipcRenderer.send("file-drop", droppedFiles[0].path);
    },
    toggleShowFiles() {
      this.showFiles = !this.showFiles;
    },
    nodePaint(
      node: TreeNode,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ): void {
      if (node != undefined) {
        let viewportWidth: number = this.graph?.width()
          ? this.graph.width()
          : 0;
        let viewportHeight: number = this.graph?.width()
          ? this.graph.height()
          : 0;

        let x = -ctx.getTransform().e + viewportWidth / 2; // nach rechts draggen macht x kleiner, also -100 usw.
        let y = -ctx.getTransform().f + viewportHeight / 2; // nach unten macht y kleiner, also -100 usw.

        let nodeX = Math.round(node.getX()) * globalScale;
        let nodeY = Math.round(node.getY()) * globalScale;
        if (
          true ||
          nodeX > x - viewportWidth / 2 &&
          nodeX < x + viewportWidth / 2 &&
          nodeY > y - viewportHeight / 2 &&
          nodeY < y + viewportHeight / 2
        ) {
          // Draw wider nodes by 1px on shadow canvas for more precise hovering (due to boundary anti-aliasing)
          const r = Math.sqrt(Math.max(0, node.size || 1)) * 1 + 0;
          ctx.beginPath();
          ctx.arc(
            node.x ? node.x : 0,
            node.y ? node.y : 0,
            r,
            0,
            2 * Math.PI,
            false
          );
          ctx.fillStyle = node.getHSL();
          ctx.fill();

          if (
            this.showImages &&
            (node.getName().endsWith("jpg") ||
              node.getName().endsWith("png") ||
              node.getName().endsWith("gif")) &&
            globalScale > 2
          ) {
            console.log("scale: " + globalScale);

            console.log();

            let img: HTMLImageElement | null = loadImage("file://" + node.path);

            const size = r * 2;
            ctx.imageSmoothingEnabled = false;
            ctx.save();
            ctx.beginPath();
            ctx.arc(
              node.x ? node.x : 0,
              node.y ? node.y : 0,
              r,
              0,
              2 * Math.PI,
              false
            );
            ctx.closePath();
            ctx.clip();

            ctx.globalAlpha = Math.min((globalScale - 2) / 8, 1);

            if (img != null) {
              let w =
                img.naturalHeight > img.naturalWidth
                  ? size
                  : size * (img.naturalWidth / img.naturalHeight);
              let h =
                img.naturalHeight > img.naturalWidth
                  ? size * (img.naturalHeight / img.naturalWidth)
                  : size;

              ctx.drawImage(
                img,
                (node.x ? node.x : 0) - w / 2,
                (node.y ? node.y : 0) - h / 2,
                w,
                h
              );
            }
            ctx.globalAlpha = 1.0;

            ctx.beginPath();
            ctx.arc(
              node.x ? node.x : 0,
              node.y ? node.y : 0,
              r,
              0,
              2 * Math.PI,
              false
            );
            ctx.clip();
            ctx.closePath();
            ctx.restore();
          }

          if (
            ((this.showNames || node.depth == 0) &&
              node.isDirectory &&
              globalScale > Math.min(node.depth, 4)) ||
            (!node.isDirectory && globalScale > 8)
          ) {
            ctx.font = `${25 / globalScale}px Lato`;
            ctx.fillText(
              `${node.name}  ${node.size}mb`,
              node.x ? node.x + r + 3 : 0,
              node.y ? node.y + 2 : 0
            );
          }
        }
      }
    },
  },
  mounted() {
    let vm = this;
    window.onresize = function () {
      vm.graph?.width(
        document.getElementsByClassName("canvas-wrapper")[0].clientWidth
      );
      vm.graph?.height(
        document.getElementsByClassName("canvas-wrapper")[0].clientHeight
      );
    };

    ipcRenderer.on("files-added", function (event: any, rootFile: TreeNode) {});

    let div: HTMLElement | null = document.getElementById("graph");

    if (div !== null) {
      interface test {
        x: number;
      }

      this.graph = ForceGraph()(div)
        // .linkDirectionalParticles(2)
        .linkWidth(2)
        // .nodeLabel((n:TreeNode)=>n.path)
        .minZoom(0.1)
        .maxZoom(20)
        .warmupTicks(0)
        //  .dagMode("radialout")
        //.dagMode("td")
        .dagNodeFilter(function (n: NodeObject) {
          let node = n as TreeNode;
          return node.isDirectory();
        })
        .nodeLabel(function (n: NodeObject) {
          let node = n as TreeNode;
          return node.getPath();
        })
        .nodeVisibility(function (n: NodeObject) {
          let node = n as TreeNode;
          return vm.showFiles || node.isDirectory();
        })
        .linkVisibility(function (n: LinkObject) {
          let s = n.source as TreeNode;
          let t = n.target as TreeNode;
          return vm.showFiles || t.isDirectory();
        })
        .backgroundColor("#555")
        // .cooldownTime(100)
        .nodeRelSize(4)
        .nodeVal((n: any) => n.size)
        .nodeCanvasObject(function (
          node: NodeObject,
          ctx: CanvasRenderingContext2D,
          globalScale: number
        ): void {
          vm.nodePaint(node as TreeNode, ctx, globalScale);
        })
        .graphData(globalData);

      // @ts-ignore: Unreachable code error
      // let force = this.graph.d3Force("link", null);
      // @ts-ignore: Unreachable code error
      this.graph.d3Force("center", null);
      // @ts-ignore: Unreachable code error
      // let charge = this.graph.d3Force("charge", null);
      this.graph.d3Force("collision", d3.forceCollide(6));

      // prevents the simulation from beeing stopped.
      this.graph
        .d3AlphaMin(0)
        // .d3AlphaDecay(1 - Math.pow(0.001, 1 / 300) )
        .d3AlphaDecay(0);

      let charge = this.graph.d3Force("charge");
      if (charge != null) {
        charge.distanceMax(1500);
        // charge.distanceMin();
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

.canvas-wrapper {
  width: 100%;
  height: 100%;
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
