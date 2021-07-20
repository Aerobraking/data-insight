<template>
  <div class="foobar">
    <input
      class="canvas-breadcrumbs"
      v-model="breadcumbs"
      placeholder="Pfad..."
    />
    <input
      type="search"
      @input="searchUpdate"
      class="canvas-search"
      @paste="onpaste"
      v-model="searchString"
      placeholder="Suche..."
    />

    <div
      @dblclick="openFolder"
      class="graph canvas-wrapper"
      @click.ctrl="toggleShowFiles"
      @dragover.prevent
      @drop.prevent="dropFiles"
    ></div>
  </div>
</template>

<script lang="ts">
const fs = require("fs");
const path = require("path");
// without "window.", the fsevent module can' be loaded on osx
const chokidar = window.require("chokidar");
const { shell } = require("electron"); // deconstructing assignment

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

import { TreeNode, TreeLink, TreeStructure } from "../../store/model/FileTree";
import * as d3 from "d3";
import * as _ from "underscore";
import { Overview } from "@/store/model/OverviewDataModel";
import { forEach } from "underscore";

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

function incrementNumber(
  start: number,
  end: number,
  feedback: (value: number) => void,
  numberValue: number = 0
) {
  numberValue++;

  feedback((end - start) * (numberValue / 30));

  if (numberValue < 30) {
    var numberAnimation = setTimeout(function () {
      incrementNumber(start, end, feedback, numberValue);
    }, 30);
  } else {
    return;
  }
}
let listRootNodes: Array<TreeNode> = [];

const { ipcRenderer } = require("electron");
let counter = 0;
const globalData: TreeStructure = new TreeStructure();
const column = 950;

export default defineComponent({
  name: "OverviewCanvas",
  created: function () {
    this.$el.addEventListener("keyup", this.keyPressed);
  },
  props: {
    model: Overview,
  },
  data(): {
    layoutToggle: boolean;
    showNames: boolean;
    showImages: boolean;
    showFiles: boolean;
    graph: ForceGraphInstance | undefined;
    nodeHovered: TreeNode | null;
    nodeHoveredList: TreeNode[];
    searchMatchList: string[];
    watchReady: boolean;
    searchString: string;
    breadcumbs: string;
  } {
    return {
      searchString: "",
      breadcumbs: "",
      watchReady: false,
      layoutToggle: false,
      showNames: true,
      showFiles: false,
      showImages: false,
      nodeHoveredList: [],
      searchMatchList: [],
      nodeHovered: null,
      graph: undefined,
    };
  },
  methods: {
    onpaste(e: ClipboardEvent) {
      console.log(e.clipboardData?.getData("text"));
    },
    searchUpdate() {
      this.searchMatchList = [];

      for (let index = 0; index < globalData.nodes.length; index++) {
        const end: TreeNode = globalData.nodes[index];

        if (
          this.searchString.trim().length > 0 &&
          end.getName().toLowerCase().includes(this.searchString.toLowerCase())
        ) {
          this.searchMatchList.push(end.getPath());
          let path = end.parents();
          for (let j = 0; j < path.length; j++) {
            const element: TreeNode = path[j];
            if (!this.searchMatchList.includes(element.getPath())) {
              this.searchMatchList.push(element.getPath());
            }
          }
        }
      }

      console.log("asdasd");
    },
    keyPressed(e: KeyboardEvent) {
      if (e.ctrlKey) {
        switch (e.key) {
          case "i":
            this.showImages = !this.showImages;
            break;
          case "t":
            this.toggleLayout();
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


      function getFiles(dir: string, parent: TreeNode, hue: number = 0,maxDepth:number=10) {
        let files = fs.readdirSync(dir);
        let index = 0;

        // files = files.filter((file: any) => {
        //   const filePath = path.join(dir, file);
        //   const fileStat = fs.lstatSync(filePath);
        //   return fileStat.isDirectory();
        // });



        files.forEach((file: any) => {
          const filePath = path.join(dir, file);
          const fileStat = fs.lstatSync(filePath);

          let child: TreeNode = new TreeNode(filePath);
          child.setIsDirectory(fileStat.isDirectory());
          child.name = file;
          child.path = filePath;
          child.parent = parent;

          child.depthCalc();
          child.x = child.depth * column;
          child.y = (parent.y!=undefined? parent.y:0) + (1000/Math.pow(child.depth,2)) * index ;

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
          if (child.isDirectory()&& child.depth<maxDepth) {
            getFiles(filePath, child, hue,maxDepth);
          }
          index++;
        });
      }

      let maxDepth=5;

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
        getFiles(pathRoot, rootFile,0,maxDepth);
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

        let nodes: TreeNode[] = rootFile.descendants();

        let links: TreeLink[] = rootFile.links();

        let maxDepth: number = Math.max.apply(
          Math,
          nodes.map(function (o: TreeNode) {
            return o.depth;
          })
        );
        let noTimedAdding = !true;
        /**
         * wenn wir ein parent haben, starten wir bei der depth eins unter ihm, also der seiner children.
         */
        if (noTimedAdding) {
          globalData.nodes.push(...nodes);
          globalData.links.push(...links);
          this.graph.graphData(globalData);
          vm.updateForces();
        } else {
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

                globalData.nodes.push(...nodesSub.map((n: TreeNode) => n));

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
                  vm.updateForces();
                }
              }, 500 * (index < 2 ? 0 : index));
            })(i, j);
          }
        }
      }
    },
    openFolder() {
      if (this.nodeHovered != null) {
        //shell.showItemInFolder('filepath') // Show the given file in a file manager. If possible, select the file.
        if (this.nodeHovered.getPath() != undefined) {
          shell.openPath(this.nodeHovered.getPath()); // Open the given file in the desktop's default manner.
        }
      }
    },
    dropFiles(e: DragEvent) {
      let droppedFiles: FileList | undefined = e.dataTransfer?.files;
      if (!droppedFiles) return;
      // this tip, convert FileList to array, credit: https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/
      let index = 0;
      let vm = this;

      
      globalData.nodes.forEach((e: TreeNode) => {
        e.parent = undefined;
        e.children.forEach((c: TreeNode) => {
          c.parent = undefined;
        });
      });

      console.log(JSON.stringify(globalData));

      const obj = JSON.parse(JSON.stringify(globalData));
console.log();
console.log();
console.log();

      console.log(obj);

      for (let index = 0; index < droppedFiles.length; index++) {
        const element: File = droppedFiles[index];
        setTimeout(function () {
          vm.addData(undefined, element.path);
        }, index++ * 400);
      }

      // ipcRenderer.send("file-drop", droppedFiles[0].path);
    },
    toggleShowFiles() {
      this.showFiles = !this.showFiles;
    },
    updateForces: function () {
      // @ts-ignore: Unreachable code error
      let charge: any = this.graph.d3Force("charge");
      if (charge != null) {
        //   charge.distanceMax(2500);

        charge.strength(function (d: any, i: number) {
          return -(600 + d.size * 0.05) + (d.depth == 0 ? -2500 : 0); //d.size / 0.3;
        });
      }
    },
    toggleLayout: function () {
      this.layoutToggle = !this.layoutToggle;

      if (this.layoutToggle||true) {
        // incrementNumber(0, 5.5, (value) => {
        //   // @ts-ignore: Unreachable code error
        //   this.graph.d3Force(
        //     "x",
        //     // @ts-ignore: Unreachable code error
        //     d3
        //       .forceX()
        //       .x(function (d: any) {
        //         return (d.depth + 0) * column;
        //       })
        //       .strength(value)
        //   );
        // });

 // @ts-ignore: Unreachable code error
         this.graph.d3Force(
            "x",
            // @ts-ignore: Unreachable code error
            d3
              .forceX()
              .x(function (d: any) {
                return (d.depth + 0) * column;
              })
              .strength(5)
          );

        // @ts-ignore: Unreachable code error
       // this.graph.d3Force("y", d3.forceY().y(0).strength(0.015));

        // @ts-ignore: Unreachable code error
        this.graph.d3Force(
          "y",
          // @ts-ignore: Unreachable code error
          d3
            .forceY()
            .y(function (d: any) {
              return d.parent != undefined ? d.parent.getY() : 0;
            })
            .strength(0.015)
        );
      } else {
        // @ts-ignore: Unreachable code error
        this.graph.d3Force(
          "x",
          // @ts-ignore: Unreachable code error
          d3
            .forceX()
            .x(function (d: any) {
              return (d.depth + 0) * column;
            })
            .strength(8.5)
            .strength(0)
        );

        // @ts-ignore: Unreachable code error
        this.graph.d3Force("y", d3.forceY().y(0).strength(0.015));

        // @ts-ignore: Unreachable code error
        this.graph.d3Force(
          "y",
          // @ts-ignore: Unreachable code error
          d3
            .forceY()
            .y(function (d: any) {
              return d.parent != undefined ? d.parent.getY() : 0;
            })
            .strength(0.015)
            .strength(0.0)
        );
      }

      // @ts-ignore: Unreachable code error
      let charge: any = this.graph.d3Force("charge");
      if (charge != null) {
        //   charge.distanceMax(2500);

        charge.strength(function (d: any, i: number) {
          return -(600 + d.size * 0.05) + (d.depth == 0 ? -2500 : 0); //d.size / 0.3;
        });
      }
    },
    linkPaint(link: TreeLink, ctx: CanvasRenderingContext2D) {
      const start: TreeNode = link.source;
      const end: TreeNode = link.target;

      if (this.nodeHovered != null) {
        if (!this.nodeHoveredList.includes(end)) {
          ctx.strokeStyle = end.getHSL(0.1);
        } else {
          ctx.strokeStyle = end.getHSL(1, 10);
        }
      } else {
        ctx.strokeStyle = end.getHSL();
      }

      if (
        this.searchString.trim().length > 0 &&
        !this.searchMatchList.includes(end.getPath())
      ) {
        ctx.strokeStyle = end.getHSL(0.1);
      }

      ctx.beginPath();
      // ctx.moveTo(start.getX(), start.getY());
      // ctx.lineTo(end.getX(), end.getY());
      ctx.lineWidth = 1.1 / (this.graph != undefined ? this.graph.zoom() : 1);

      ctx.moveTo(start.getX(), start.getY());
      let midY = (start.getY() + end.getY()) / 2;
      let midX = (start.getX() + end.getX()) / 2;
      // ctx.bezierCurveTo(start.getX(), midY, end.getX(), midY, end.getX(),end.getY());
      ctx.bezierCurveTo(
        midX,
        start.getY(),
        midX,
        end.getY(),
        end.getX(),
        end.getY()
      );
      ctx.stroke();
    },
    tick() {
        // @ts-ignore: Unreachable code error
        this.graph.d3Force(
          "y",
          // @ts-ignore: Unreachable code error
          d3
            .forceY()
            .y(function (d: any) {
              return d.parent != undefined ? d.parent.getY() : 0;
            })
            .strength(0.15)
        );
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
          (nodeX > x - viewportWidth / 2 &&
            nodeX < x + viewportWidth / 2 &&
            nodeY > y - viewportHeight / 2 &&
            nodeY < y + viewportHeight / 2)
        ) {
          // Draw wider nodes by 1px on shadow canvas for more precise hovering (due to boundary anti-aliasing)
          let r = 10 + Math.sqrt(node.size / Math.PI) * 1.05;
          r = node.depth == 0 ? 10 : r;

          r =
            node.depth > 0 &&
            this.nodeHovered != null &&
            node.getPath() === this.nodeHovered.getPath()
              ? r * 1.5
              : r;

          r =
            (r / (this.graph != undefined ? this.graph.zoom() : 1)) * 0.05 +
            r * 0.95;

          ctx.beginPath();
          ctx.arc(
            node.x ? node.x : 0,
            node.y ? node.y : 0,
            r,
            0,
            2 * Math.PI,
            false
          );

          let show = true;

          if (this.nodeHovered != null) {
            show = this.nodeHoveredList.includes(node);
            if (!show) {
              ctx.fillStyle = node.getHSL(0.1);
            } else {
              ctx.fillStyle = node.getHSL(1, 10);
            }
          } else {
            ctx.fillStyle = node.getHSL();
          }

          if (
            this.searchString.trim().length > 0 &&
            !this.searchMatchList.includes(node.getPath())
          ) {
            show = false;
            ctx.fillStyle = node.getHSL(0.1);
          }

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
              show &&
              globalScale > Math.min(node.depth / 10, 0.08)) ||
            (!node.isDirectory && globalScale > 0.8) ||
            (this.searchString.trim().length > 0 && show)
          ) {
            let x = node.x ? node.x + 0 + (node.depth == 0 ? -20 : r + 25) : 0;
            let y = node.y ? node.y + 2 : 0;

            ctx.font = `${13 / globalScale}px Lato`;

            if (node.depth > 0) {
              ctx.fillStyle = "#00000066";
              ctx.fillRect(
                x - 4 / globalScale,
                y - 14 / globalScale,
                ctx.measureText(node.getName()).width + 8 / globalScale,
                22 / globalScale
              );
            }

            ctx.textAlign = node.depth == 0 ? "right" : "left";
            ctx.fillStyle = "#fff";

            ctx.fillText(`${node.name}  `, x, y);
            //${node.size}mb
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

    let div: HTMLElement = this.$el.getElementsByClassName("canvas-wrapper")[0];

    if (div !== null) {
      interface test {
        x: number;
      }

      this.graph = ForceGraph()(div)
        // .linkDirectionalParticles(2)
        // .nodeLabel((n:TreeNode)=>n.path)
        .minZoom(0.02)
        .maxZoom(20)
        .zoom(0.1)
        .onNodeClick(function (n: NodeObject, e: MouseEvent) {})
        .onNodeHover(function (n: NodeObject | null, nPrev: NodeObject | null) {
          vm.nodeHovered = n as TreeNode;

          if (vm.nodeHovered != n && n != null) {
            let node = n as TreeNode;
            vm.breadcumbs = node.getPath().replaceAll("\\", "  /  ");
            vm.nodeHoveredList = [];
            vm.nodeHoveredList.push(...node.descendants(), ...node.parents());
          }
        })
        //  .dagMode("radialout")
        // .dagMode("lr")
        .dagNodeFilter(function (n: NodeObject) {
          let node = n as TreeNode;
          return node.isDirectory();
        })
        .nodeLabel(function (n: NodeObject) {
          let node = n as TreeNode;
          // return node.getPath();
          return "";
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
        .onEngineTick(this.tick)
        .backgroundColor("#111")
        .nodeId("path")
        .nodeRelSize(4)
        .cooldownTime(105 * 1000)
        .nodeVal((n: any) => n.size + 75)
        .nodeCanvasObject(function (
          node: NodeObject,
          ctx: CanvasRenderingContext2D,
          globalScale: number
        ): void {
          vm.nodePaint(node as TreeNode, ctx, globalScale);
        })
        .linkCanvasObject(function (
          node: LinkObject,
          ctx: CanvasRenderingContext2D
        ): void {
          vm.linkPaint(node as TreeLink, ctx);
        })
        .graphData(globalData);

      // @ts-ignore: Unreachable code error
      // let force = this.graph.d3Force("link", null);
      // @ts-ignore: Unreachable code error
      this.graph.d3Force("center", null);
      // this.graph.d3Force("collision", null);

      // prevents the simulation from beeing stopped.
      this.graph.d3AlphaMin(0).d3AlphaDecay(1 - Math.pow(0.001, 1 / 10000));
      this.graph.d3AlphaMin(0).d3AlphaDecay(0.00528);
      // .d3AlphaDecay(0);

      // @ts-ignore: Unreachable code error
      this.graph.d3Force(
        "x",
        // @ts-ignore: Unreachable code error
        d3
          .forceX()
          .x(function (d: any) {
            return (d.depth + 0) * column;
          })
          .strength(2.5)
          .strength(0)
      );

      // @ts-ignore: Unreachable code error
      this.graph.d3Force("y", d3.forceY().y(0).strength(0.015));

      // @ts-ignore: Unreachable code error
      this.graph.d3Force(
        "y",
        // @ts-ignore: Unreachable code error
        d3
          .forceY()
          .y(function (d: any) {
            return d.parent != undefined ? d.parent.getY() : 0;
          })
          .strength(0.015)
          .strength(0.0)
      );

      let link: any = this.graph.d3Force("link");
      link.strength(function (link: TreeLink) {
        return Math.min((link.source.depth + 0) * 0.1, 1.5);
      });
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

.canvas-search {
  position: absolute;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: 500px;
  z-index: 4000;
  top: 76px;
}

.canvas-breadcrumbs {
  position: absolute;
  left: 0;
  right: 0;
  margin-left: auto;
  margin-right: auto;
  width: 1900px;
  z-index: 4000;
  top: 45px;
  text-align: left;
  background-color: rgb(36, 36, 36);
  color: #fff;
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
