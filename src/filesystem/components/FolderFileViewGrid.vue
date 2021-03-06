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
import * as cache from "../utils/ImageCache";
import { defineComponent } from "vue";
import { FolderWindowFile } from "@/filesystem/model/FileSystemWorkspaceEntries";
import * as icons from "../utils/IconHandler";
import { Dispatcher } from "@/core/utils/WorkspaceUtils";
export default defineComponent({
  name: "wsfolderfile",
  props: {
    entry: {
      type: FolderWindowFile,
      required: true,
    },
    searchstring: String,
  },
  data(): { listener: any } {
    return { listener: undefined };
  },
  unmounted() {
    Dispatcher.instance.unregisterCallback(this.listener);
  },
  mounted() {
    const _this = this;
    this.listener = {
      featureEvent(
        feature: string | undefined,
        min: number,
        max: number,
        getColor: (node: any, stat: number, min: number, max: number) => string
      ) {
        if (!feature) {
          _this.$el.style.color = "";
          _this.$el.style.opacity = "";
          return;
        }
        const color = getColor(undefined, _this.entry.size, min, max);

        _this.$el.style.opacity = color == "h" ? "0.05" : "";
        _this.$el.style.color = color;
      },
    };
    Dispatcher.instance.registerCallback(this.listener);

    const div: HTMLElement =
      this.$el.getElementsByClassName("folder-file-image")[0];

    // prevents a bug that new instances of the components contain the style of previous instances
    div.style.background = "";

    const isImage: boolean = cache.isImageTypeSupported(this.entry.path);

    div.classList.add(isImage ? "folder-file-preview" : "folder-file-icon");

    if (!isImage) { 
      icons.IconHandler.registerPath(this.entry.path, (url: string) => {
        var img = new Image();
        img.src = url;
        div.style.backgroundImage = "url('" + img.src + "')";
      });
    }
  },
  watch: {
    // whenever the current folder path changes, update the file list
    "entry.loadImage": function (newPath: boolean, oldPath: boolean) {
      this.loadImage();
    },
    searchstring: function (newValue: string, oldValue: string) {
      this.searchUpdate();
    },
  },
  methods: {
    loadImage() { 

      const div: HTMLElement =
        this.$el.getElementsByClassName("folder-file-image")[0];

      const isImage: boolean = cache.isImageTypeSupported(this.entry.path);

      div.classList.add(isImage ? "folder-file-preview" : "folder-file-icon");

      if (isImage) {
        cache.ImageCache.registerPath(this.entry.path, {
          callback: (url: string, type: cache.ImageSize) => {
            if (type == cache.ImageSize.small) {
              div.style.backgroundImage = url;
            }
          },
          callbackSize: (dim: cache.ImageDim) => {},
        });
      }
    },
    searchUpdate() {
      const found: boolean =
        !this.searchstring ||
        this.entry.filename
          .toLowerCase()
          .includes(this.searchstring.toLowerCase());
      this.$el.classList.toggle("prevent-input", !found);
      this.$el.classList.toggle("search-not-found", !found);
      this.$el.classList.toggle("file-not-found", !found);
    },
    dragstart(e: DragEvent) {},
    itemClicked(type: "control" | "shift" | "single") {
      this.$emit("itemClicked", this.entry.id, type);
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@import "@/core/components/styles/variables.scss";


.file-not-found {
  display: none;
}

.folder-file {
  z-index: 100;
  padding: 10px;
  height: 180px;
  box-sizing: border-box;
  margin: 5px;

  &:hover {
    background: $color-Selection;
  }

  p {
    width: 150px;
    word-break: break-all;
    padding: 0;
    margin: 0 auto;
    margin-top: 4px;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2; /* number of lines to show */
    line-clamp: 2;
    -webkit-box-orient: vertical;
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
