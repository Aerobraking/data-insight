<template>
  <tr
    ref="el"
    @mousedown.left.shift.stop.exact="itemClicked('shift')"
    @mousedown.left.ctrl.stop.exact="itemClicked('control')"
    @mousedown.left.stop.exact="itemClicked('single')"
    @dragstart="dragstart"
  >
    <td><div class="folder-file-image"></div></td>
    <td>{{ entry.filename }}</td>
    <td>{{ entry.isDirectory ? "" : entry.getSizeFormatted() }}</td>
  </tr>
</template>

<script lang="ts">
import * as cache from "../../utils/ImageCache";
import { defineComponent } from "vue";
import { FolderWindowFile } from "../../store/model/implementations/filesystem/FileSystemWorkspaceEntries";
import { Dispatcher } from "../app/WorkspaceUtils";

export default defineComponent({
  name: "wsfolderfile",
  props: {
    entry: {
      type: FolderWindowFile,
      required: true,
    },
    searchstring: String, 
  },
  data(): {
    listener: any;
  } {
    return {
      listener: undefined,
    };
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
          _this.$el.getElementsByTagName("td")[2].style.color = "";
          _this.$el.style.opacity = "h";
          return;
        }
        const color = getColor(undefined, _this.entry.size, min, max);
        _this.$el.style.opacity = color == "h" ? "0.05" : "";
        _this.$el.getElementsByTagName("td")[2].style.color = color;
      },
    };
    Dispatcher.instance.registerCallback(this.listener);
    let el: any = this.$el;

    const div: Element =
      this.$el.getElementsByClassName("folder-file-image")[0];

    const isImage: boolean = cache.isImageTypeSupported(this.entry.path);

    div.classList.add(isImage ? "folder-file-preview" : "folder-file-icon");

    // if (isImage) {
    //   cache.ImageCache.registerPath(this.entry.path, {
    //     callback: (
    //       url: string,
    //       type: cache.ImageSize
    //     ) => {
    //       if (type == cache.ImageSize.small) {
    //         el.getElementsByClassName(
    //           "folder-file-image"
    //         )[0].style.backgroundImage = url;
    //       }
    //     },
    //     callbackSize: (dim: cache.ImageDim) => {},
    //   });
    // } else {
    //   icons.IconHandler.registerPath(this.entry.path, (url: string) => {
    //     var img = new Image();
    //     img.src = url;
    //     el.getElementsByClassName(
    //       "folder-file-image"
    //     )[0].style.backgroundImage = "url('" + img.src + "')";
    //   });
    // }
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
      // this.$emit("dragstarted", this.entry, this.$el, e);
    },
    itemClicked(type: "control" | "shift" | "single") {
      //   this.$emit("itemClicked", this.entry, this.$el, type);
      this.$emit("itemClicked", this.entry.id, type);
    },
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
$color-Selection: rgba(57, 215, 255, 0.1);

tr {
  height: 25px;
}
td {
}

td:nth-child(1) {
  width: 30px;
  height: 30px;
  padding: 5px;

  div {
    background-size: cover;
    background-position: center left;
    width: 100%;
    height: 100%;
  }
}

td:nth-child(3) {
  text-align: right;
  min-width: 150px;
}

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
