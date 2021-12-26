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
import * as cache from "../../utils/ImageCache";
import { defineComponent } from "vue";
import { FolderWindowFile } from "../../store/model/FileSystem/FileSystemEntries";
import * as icons from "../../utils/IconHandler";
export default defineComponent({
  name: "wsfolderfile",
  props: {
    entry: {
      type: FolderWindowFile,
      required: true,
    },
    searchstring: String,
    viewKey: Number,
  },
  mounted() {
    let el: any = this.$el;

    const div: HTMLElement =
      this.$el.getElementsByClassName("folder-file-image")[0];

    const isImage: boolean = cache.isImageTypeSupported(this.entry.path);

    div.classList.add(isImage ? "folder-file-preview" : "folder-file-icon");

    if (isImage) {
      cache.ImageCache.registerPath(this.entry.path, {
        callback: (
          url: string,
          type: "preview" | "tiny" | "small" | "medium" | "original"
        ) => {
          if (type == "small") {
          div.style.backgroundImage = url;
          }
        },
        callbackSize: (dim: cache.ImageDim) => {},
      });
    } else {
      icons.IconHandler.registerPath(this.entry.path, (url: string) => {
        var img = new Image();
        img.src = url;
       div.style.backgroundImage = "url('" + img.src + "')";
      });
    }
  },
  watch: {
    searchstring: function (newValue: string, oldValue: string) {
      this.searchUpdate();
    },
  },
  methods: {
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
    dragstart(e: DragEvent) { 
    },
    itemClicked(type: "control" | "shift" | "single") { 
      this.$emit("itemClicked", this.entry.id, type);
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
$color-Selection: rgba(57, 215, 255, 0.1);

.file-not-found {
  display: none;
}

.folder-file {
  z-index: 100;
  // will-change: transform;
  padding: 10px;
  height: 180px;
  box-sizing: border-box;
  margin: 5px;

  &:hover {
    background: $color-Selection;
  }

  p {
    width: 150px;
    // word-wrap: break-word;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0;
    margin: 0 auto;
    margin-top: 4px;
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
