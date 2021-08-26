<template>
  <div class="folder-file">
    <div class="folder-file-symbol"></div>
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

    if (cache.isImageTypeSupported(this.entry.path)) {
      cache.ImageCache.registerPath(this.entry.path, {
        callback: (url: string, type: "small" | "medium" | "original") => {
          if (type == "small") {
            el.getElementsByClassName(
              "folder-file-symbol"
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
          "folder-file-symbol"
        )[0].style.backgroundImage = "url('" + img.src + "')";
      });
    }
  },

  methods: {},
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

  .folder-file-symbol {
    height: 75px;
    width: 75px;
    display: block;
    background-size: cover;
    background-color: #f1f1f100;
    border: none;
    clear: both;
    border: none;
    margin: 0 auto;
  }
}
</style>
