<template>
  <div
    @mousedown.left.shift.stop.exact="itemClicked('shift')"
    @mousedown.left.ctrl.stop.exact="itemClicked('control')"
    @mousedown.left.stop.exact="itemClicked('single')"
    @dragstart="dragstart"
    class="folder-file"
  >
    <div class="folder-file-image"></div>
    <p>{{ entry.filename }}</p>
  </div>
</template>

<script lang="ts">
import * as cache from "./../../utils/ImageCache";
import { defineComponent } from "vue";
import { FolderWindowFile } from "../../store/model/Workspace";
import * as icons from "./../../utils/IconHandler";
export default defineComponent({
  name: "wsfolderfile",

  props: {
    entry: {
      type: FolderWindowFile,
      required: true,
    },
    viewKey: Number,
  },
  mounted() {
    let el: any = this.$el;

    const div: Element =
      this.$el.getElementsByClassName("folder-file-image")[0];

    const isImage: boolean = cache.isImageTypeSupported(this.entry.path);

    div.classList.add(isImage ? "folder-file-preview" : "folder-file-icon");

    if (isImage) {
      cache.ImageCache.registerPath(this.entry.path, {
        callback: (url: string, type: "small" | "medium" | "original") => {
          if (type == "small") {
            el.getElementsByClassName(
              "folder-file-image"
            )[0].style.backgroundImage = url;
          }
        },
        callbackSize: (dim: cache.ImageDim) => {},
      });
    } else {
      icons.IconHandler.registerPath(this.entry.path, (url: string) => {
        var img = new Image();
        img.src = url;
        el.getElementsByClassName(
          "folder-file-image"
        )[0].style.backgroundImage = "url('" + img.src + "')";
      });
    }
  },

  methods: {
    dragstart(e: DragEvent) {
      this.$emit("dragstarted", this.entry, this.$el, e);
    },
    itemClicked(type: "control" | "shift" | "single") {
      this.$emit("itemClicked", this.entry, this.$el, type);
      switch (type) {
        case "single":
          // this.getEntries().forEach((e) =>
          //   e.classList.remove("workspace-is-selected")
          // );

          break;
        case "control":
          break;
        case "shift":
          break;
      }
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.folder-file {
  z-index: 100;
  // will-change: transform;
  color: #f1f1f1;
  padding: 10px;
  height: 180px;
  box-sizing: border-box;
  margin: 5px;

  p {
    width: 150px;
    word-wrap: break-word;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0;
    margin: 0 auto;
    margin-top: 4px;
    color: #222;
    text-align: center;
  }

  @mixin preview() {
    display: block;
    background-size: cover;
    background-color: transparent;
    border: none;
    clear: both;
    border: none;
    margin: 0 auto;
  }

  .folder-file-icon {
    @include preview();
    height: 75px;
    width: 75px;
  }
  .folder-file-preview {
    @include preview();
    height: 120px;
    width: 145px;
  }
}
</style>
