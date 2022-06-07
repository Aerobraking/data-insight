<template>
  <div ref="el" @mousedown.left.shift.stop.exact="entrySelectedLocal('add')"
    @mousedown.left.ctrl.stop.exact="entrySelectedLocal('toggle')"
    @mousedown.left.stop.exact="entrySelectedLocal('single')" @click.stop class="ws-entry-youtube-wrapper">
    <div class="youtube-input" :class="{ showURL: entry.videoId.length == 0 || entry.alert }">
      <p>Video ID:</p>
      <div class="videoid-input">
        <input @paste="paste" @mousedown.stop @mousemove.stop @keydown.stop @keyup.stop @paste.stop type="text"
          v-model="entry.videoId" placeholder="URL/Video ID" />
        <ContentCopy class="svg-download" @click="copyYTLink" />
      </div>
      <p>Start:</p>
      <input @mousedown.stop @mousemove.stop @keydown.stop @keyup.stop @paste.stop class="timestamp-input" type="time"
        step="1" v-model="entry.timestamp" v-on:change="manualTimestamp" placeholder="Time in Seconds" />
      <div @mouseup="changeTimestamp" @mousedown.stop @mousemove.stop @keydown.stop @keyup.stop @paste.stop
        class="timestamp-new" v-show="timestampNew != entry.getTimestamp()">
        {{ timestampNewString }}
      </div>
    </div>

    <div class="editor-enabler-div" @mousedown.left.ctrl.stop.exact="entrySelectedLocal('toggle', $event)"
      @mousedown.left.stop.exact="entrySelectedLocal('single', $event)"></div>

    <div class="outer-wrapper">
      <div class="inner-wrapper"></div>
    </div>
  </div>
</template>

<script lang="ts">
// import { load } from "youtube-iframe";
import { defineComponent } from "vue";
import {
  ContentCopy,
} from "mdue";
import { WorkspaceEntryYoutube } from "@/filesystem/model/FileSystemWorkspaceEntries";
import { timeHHMMSSFormat } from "../utils/FileStringFormatter";
var YouTubeIframeLoader = require("youtube-iframe");
const { clipboard } = require('electron')

export default defineComponent({
  name: "wsentryyoutube",
  components: {
    ContentCopy,
  },
  data(): {
    ytplayer: any;
    timestampNew: number;
    timestampNewString: string;
    width: number;
  } {
    return {
      ytplayer: null,
      timestampNew: 0,
      timestampNewString: "",
      width: 0
    };
  },
  props: {
    entry: {
      type: WorkspaceEntryYoutube,
      required: true,
    },
  },
  watch: {
    "entry.videoId": function (newValue: string, oldValue: string) {
      if (newValue != oldValue) this.updateIframe();
    },
  },
  mounted() {
    const _this = this;
    const div = this.$el.getElementsByClassName("inner-wrapper")[0];
    this.timestampNew = this.entry.getTimestamp();

    YouTubeIframeLoader.load(function (YT: any) {
      /**
       * Api: https://developers.google.com/youtube/iframe_api_reference
       * Options: https://developers.google.com/youtube/player_parameters.html?playerVersion=HTML5
       */
      _this.ytplayer = new YT.Player(div, {
        height: "400",
        width: "600",
        playerVars: {
          controls: 1,
          autoplay: 0,
          iv_load_policy: 3,
          modestbranding: 0,
          rel: 0,
          showinfo: 0,
          start: _this.entry.timestamp,
        },
        events: {
          onApiChange: _this.onApiChange,
          onReady: _this.onPlayerReady,
          onError: _this.onError,
          onStateChange: _this.onPlayerStateChange,
        },
      });
    });

    this.updateIframe();
  },
  unmounted() {
    if (this.ytplayer) {
      this.ytplayer.destroy();
    }
  },
  inject: ["entrySelected", "entrySelected", "mouseupWorkspace"],
  methods: {
    paste() {
      debugger;
      console.log("input paste");
    },
    copyYTLink() {

      clipboard.writeText(this.entry.getYouTubeLink());
    },
    manualTimestamp() {
      this.timestampNew = this.entry.getTimestamp();
      this.timestampNewString = timeHHMMSSFormat(this.timestampNew);
    },
    changeTimestamp(e: MouseEvent) {
      this.entry.timestamp = this.timestampNew;
    },
    onApiChange(e: any) { },
    onPlayerReady(e: any) {
      // when player is ready, load video by id.
      this.updateIframe();
    },
    onPlayerStateChange(e: any) {
      // 2 = Pause, 5 = time slider set
      if (e.data == 2) {
        this.timestampNew = Math.floor(this.ytplayer.getCurrentTime());
        this.timestampNewString = timeHHMMSSFormat(this.timestampNew);
      }
    },
    onError(e: any) { },
    /**
     * Test based on:
     * https://gist.github.com/tonY1883/a3b85925081688de569b779b4657439b
     */
    updateIframe() {
      if (this.ytplayer) {
        const id = this.entry.getVideoId();
        if (id != undefined && id.length > 0) {
          this.ytplayer.getIframe().style.visibility = "visible";
          const _this = this;
          var img = new Image();
          img.src = "http://img.youtube.com/vi/" + id + "/mqdefault.jpg";
          img.onload = function () {
            if (img.width === 120) {
              // video not found
              _this.entry.alert = "Video for this ID not found";
            } else {
              _this.entry.alert = undefined;
            }
            _this.ytplayer.cueVideoById(
              id, _this.entry.timestamp
            );
          }
        } else {
          this.entry.alert = undefined;
          this.ytplayer.getIframe().style.visibility = "hidden";
        }


      }
    },

    entrySelectedLocal(
      type: "add" | "single" | "toggle",
      e: MouseEvent | undefined = undefined
    ) {
      // @ts-ignore: Unreachable code error
      this.entrySelected(this.entry.id, type);

      if (e) {
        // @ts-ignore: Unreachable code error
        this.mouseupWorkspace(e);
      }
    },
  },
});
</script>
 
<style lang="scss">
@import "@/core/components/styles/variables.scss";

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.youtube-input {
  display: flex;
  background: transparent;
  transition: opacity 0.4s ease-in-out;
  opacity: 0;
  margin-bottom: 6px;

  p {
    margin: 0px 5px 0px 5px;
    line-height: 25px;
    white-space: nowrap;
    vertical-align: bottom;
  }

  input {

    font-family: "Courier New", Courier, monospace;
    color: white;
    outline: none;
    border: none;
  }


}

.videoid-input {
  height: 25px;
  width: 140px;
  float: left;
  background: #ffffff11;
  border-radius: 5px;
  text-align: right;
  margin-right: 1px;
  display: flex;

  input {
    padding: 0px 00px 0px 10px;
    width: 110px;
    background: transparent;
  }

  svg {
    margin: 0;
    padding: 4px 0 4px 0;
    font-size: 16px;
  }

}

.timestamp-input {
  padding: 0px 10px 0px 10px;
  height: 25px;
  width: 100px;
  background: #ffffff11;
  border-radius: 5px;
  text-align: right;
}

.timestamp-new {
  height: 25px;
  width: 80px;
  outline: none;
  margin-left: 5px;
  box-sizing: border-box;
  border: 1px solid $color-Selection;
  background: #ffffff11;
  color: $color-Selection;
  border-radius: 5px;
  text-align: center;
  cursor: pointer;
  line-height: 24px;
  font-size: 14px;
  font-family: "Courier New", Courier, monospace;
  transition: transform 0.2s cubic-bezier(0.64, 0.57, 0.67, 1.53);

  &:hover {
    transform: scale(1.1);
  }
}

.timestamp-new ::before {
  // layout
  content: "";
  position: absolute;
  width: 0;
  height: 0;
  bottom: 100%;
  left: 0; // offset should move with padding of parent
  border: 0.75rem solid transparent;
  border-top: none;

  // looks
  border-bottom-color: #fff;
  filter: drop-shadow(0 -0.0625rem 0.0625rem rgba(0, 0, 0, 0.1));
}

.showURL {
  opacity: 1 !important;
}

.workspace-is-selected .youtube-input {
  opacity: 1;
}

.outer-wrapper {
  position: relative;
  width: 100%;
  flex: 1 !important;
  transition: pointer-events 5000ms;
  transition-delay: 5000ms;
  background: black;
}

.ws-entry-youtube-wrapper {
  display: flex;
  flex-flow: column;

  z-index: 100;
  color: #f1f1f1;
  background-size: cover;
  background-color: transparent;
  box-sizing: border-box;

  iframe,
  object,
  embed {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
