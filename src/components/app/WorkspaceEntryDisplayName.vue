<template>
  <div
    class="wsentry-displayname"
    :class="{ 'ws-zoom-fixed': entry.displaynameResize }"
    @mousedown.capture.stop
    @mousemove.capture.stop
  >
    <div
      class="wsentry-displayname-input"
      @keydown.stop="keydown"
      @keyup.stop
      type="text"
      spellcheck="false"
      contenteditable="true"
      @input="handleInput"
      :class="{ 'hide-name': !entry.showDisplayname }"
      placeholder="Title..."
      oninput="if(this.innerHTML.trim()==='<br>')this.innerHTML=''"
    />
    <tippy :sticky="true" :offset="[-100, 40]">
      <button
        class="wsentry-displayname-pin"
        @click="entry.displaynameResize = !entry.displaynameResize"
      >
        <PinOutline v-if="entry.displaynameResize" />
        <PinOffOutline v-else />
      </button>
      <template #content>Scale Relative</template>
    </tippy>

    <button
      class="wsentry-displayname-show"
      @click="entry.showDisplayname = !entry.showDisplayname"
    >
      <EyeOutline v-if="entry.showDisplayname" />
      <EyeOffOutline v-else />
    </button>
  </div>
</template>
 

<script lang="ts">
import { Tippy } from "vue-tippy";
import {
  Resize,
  PinOffOutline,
  PinOutline,
  EyeOutline,
  EyeOffOutline,
} from "mdue";
import { defineComponent } from "vue";
import WorkspaceEntry from "@/store/model/app/WorkspaceEntry";
import { Events } from "./WorkspaceUtils";
export default defineComponent({
  el: ".wsentry-displayname",
  components: {
    Tippy,
    Resize,
    PinOffOutline,
    PinOutline,
    EyeOutline,
    EyeOffOutline,
  },
  name: "wsentrydisplayname",
  data() {
    return {};
  },
  props: {
    entry: {
      type: WorkspaceEntry,
      required: true,
    },
  },
  watch: {
    "entry.displaynameResize": function (newValue: boolean, oldValue: boolean) {
      this.updateScaling();
    },
  },
  mounted() {
    this.$el.getElementsByClassName("wsentry-displayname-input")[0].innerHTML =
      this.entry.displayname;
  },
  methods: {
    keydown(e: KeyboardEvent) {
      // Prevent Linebreak in contenteditable, because it would create html tags
      if (e.key === "Enter") e.preventDefault();
    },
    handleInput: function (e: any) {
      var s: string = e.target.innerHTML;
      this.entry.displayname = s.replaceAll("&nbsp;", "");
    },
    updateScaling(): void {
      setTimeout(() => {
        this.$el.classList.add("anim");
      }, 5);

      Events.event("fixedZoomUpdate");
      setTimeout(() => {
        if (!this.entry.displaynameResize) {
          this.$el.style.transform = "scale(" + 1 + ", " + 1 + ")";
        }
      }, 15);
      setTimeout(() => {
        this.$el.classList.toggle("anim", false);
      }, 330);
    },
  },
});
</script>

<style   lang="scss">
$padding: 10px;
$padding0: $padding/2;

$padding2: $padding * 2;

@mixin border() {
  background: rgba(255, 0, 0, 0.232);
  position: absolute;
  z-index: 1000;
  cursor: pointer;

  &:hover {
    background: rgba(255, 0, 0, 1);
  }
} 

.wsentry-displayname {
  transform-origin: left bottom;
  position: absolute;
    pointer-events: all;
  left: 0px;
  margin-left: 1px;
  top: -44px;
  width: auto;
  z-index: 20;

  div {
    background-color: transparent;
    border: none;
    color: rgb(230, 230, 230);
    font-size: 25pt;
    overflow: visible;
    outline: none;
    transition: all 350ms linear;
    min-width: 300px;
    white-space: nowrap;
    transform-origin: left bottom;
    bottom: 0;
  }
}

workspace-is-selected-single .wsentry-displayname {
  [contenteditable][placeholder]:empty:before {
    content: attr(placeholder);
    position: absolute;
    color: gray;
    background-color: transparent;
    cursor: text;
  }
}

.anim {
  transition: all 0.3s ease-out;
}

.wsentry-displayname-pin {
  position: absolute;
  left: -28px;
  top: 14px;
  background: transparent;
  color: white;
  transform-origin: left bottom;
  display: none;
  svg {
    font-size: 12px !important;
    margin: 0;
  }
}

.wsentry-displayname-show {
  position: absolute;
  left: -48px;
  top: 14px;
  background: transparent;
  color: white;
  transform-origin: left bottom;
  display: none;
  svg {
    font-size: 12px !important;
    margin: 0;
  }
}

div.workspace-is-selected-single .wsentry-displayname-pin {
  display: block;
}
div.workspace-is-selected-single .wsentry-displayname-show {
  display: block;
}
.hide-name {
  opacity: 0 !important;
}
</style>
 