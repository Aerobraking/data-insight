<template>
  <div
    ref="el"
    @mousemove.stop
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('flip')"
    @mousedown.left.stop.exact="entrySelectedLocal('single')"
    @click.stop
    v-on:dblclick="doubleClick"
    class="ws-entry-image-wrapper"
  >
    <input
      v-model="entry.displayname"
      class="wsentry-displayname ws-entry-zoom-fixed"
      placeholder=""
    />
  </div>
</template>

<script lang="ts">
const { shell } = require("electron"); // deconstructing assignment

import { defineComponent } from "vue";
import { WorkspaceEntryImage } from "../../store/model/Workspace";
import { setupEntry } from "./WorkspaceUtils";
export default defineComponent({
  name: "wsentryimage",
  data() {
    return {};
  },
  setup(props) {
    return setupEntry(props);
  },
  props: {
    entry: WorkspaceEntryImage,
    viewKey: Number,
  },
  mounted() {
    this.$el.style.transform = `translate3d(${this.$props.entry?.x}px, ${this.$props.entry?.y}px,0px)`;
    let comp = this;
    let path = this.entry?.getURL();

    const ImageLoaderWorker = new Worker("@/utils/imageloader", {
      type: "module",
    });
    ImageLoaderWorker.onmessage = (event: any) => {
      // Grab the message data from the event
      const imageData = event.data;
      console.log("bild antwort bekommen");

      // Get the original element for this image
      //const imageElement = document.querySelectorAll(`img[data-src='${imageData.imageURL}']`)

      // We can use the `Blob` as an image source! We just need to convert it
      // to an object URL first
      const objectURL = URL.createObjectURL(imageData.blob);

      // // Once the image is loaded, we'll want to do some extra cleanup
      // imageElement.onload = () => {
      //   // Let's remove the original `data-src` attribute to make sure we don't
      //   // accidentally pass this image to the worker again in the future
      //   imageElement.removeAttribute(‘data-src’)

      //   // We'll also revoke the object URL now that it's been used to prevent the
      //   // browser from maintaining unnecessary references
      //   URL.revokeObjectURL(objectURL)
      // }

      var img = new Image();
      img.onload = function () {
        let w = img.width;
        let h = img.height;
        let scale = w / 600;
        w /= scale;
        h /= scale;
        comp.$el.style.width = w + "px";
        comp.$el.style.height = h + "px";
      };
      img.src = objectURL;

      comp.$el.style.backgroundImage = "url('" + objectURL + "')";
      // imageElement.setAttribute('src', objectURL)
    };

    console.log("sende bild message");

    ImageLoaderWorker.postMessage(path);

    // this.$el.style.backgroundImage = "url('" + this.entry?.getURL() + "')";
    // if (this.entry != undefined) {
    //   var img = new Image();
    //   img.onload = function () {
    //     let w = img.width;
    //     let h = img.height;
    //     let scale = w / 600;
    //     w /= scale;
    //     h /= scale;
    //     comp.$el.style.width = w + "px";
    //     comp.$el.style.height = h + "px";
    //   };
    //   img.src = this.entry.path;
    // }
  },
  inject: ["entrySelected", "entrySelected"],
  methods: {
    entrySelectedLocal(type: "add" | "single" | "flip") {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.$el, type);
    },
    doubleClick(e: MouseEvent) {
      e.preventDefault();

      //shell.showItemInFolder('filepath') // Show the given file in a file manager. If possible, select the file.
      if (this.$props.entry?.path != undefined) {
        shell.openPath(this.$props.entry?.path); // Open the given file in the desktop's default manner.
      }
    },
    clickStart(e: MouseEvent) {},
  },
  computed: {},
  created() {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.workspace-is-selected {
  /* offset-x | offset-y | blur-radius | spread-radius | color */
  // box-shadow: 0px 0px 0px 6px #f81fc2;
  // background-color: #f81fc252;
}

.ws-entry-image-wrapper {
  // images are behind the normal stuff to use them as a background
   z-index: 90;
  background: rgba(255, 255, 255, 0.3);

  backface-visibility: hidden;
  will-change: transform;
  position: absolute;
  color: #f1f1f1;
  padding: 10px;
  width: 220px;
  height: 180px;
  background-size: cover;
  box-sizing: border-box;
}
</style>
