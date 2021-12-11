<template>
  <div
    class="wsentry-displayname"
    :class="{ 'ws-zoom-fixed': entry.displaynameResize }"
    @mousedown.capture.stop
    @mousemove.capture.stop
  >
    <input
      class="wsentry-displayname-input"
      @keydown.stop
      @keyup.stop
      type="text"
      v-model="entry.displayname"
      placeholder=""
      :class="{ 'hide-name': !entry.showDisplayname }"
    />
    <button
      class="wsentry-displayname-pin"
      @click="entry.displaynameResize = !entry.displaynameResize"
    >
      <PinOutline v-if="entry.displaynameResize" />
      <PinOffOutline v-else />
    </button>
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
import {
  Resize,
  PinOffOutline,
  PinOutline,
  EyeOutline,
  EyeOffOutline,
} from "mdue";
import { defineComponent } from "vue";
import { WorkspaceEntry } from "../../store/model/Workspace";
import { Events } from "./WorkspaceUtils";
export default defineComponent({
  el: ".wsentry-displayname",
  components: {
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
    viewKey: Number,
  },
  watch: {
    "entry.displaynameResize": function (newValue: boolean, oldValue: boolean) {
      this.updateScaling();
    },
  },
  methods: {
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
.wsentry-displayname {
  transform-origin: left bottom;
  position: absolute;
  left: 0px;
  margin-left: 1px;
  top: -40px;
  width: auto;
  z-index: 20;

  input {
    background-color: transparent;
    border: none;
    color: rgb(230, 230, 230);
    font-size: 25pt;
    overflow: visible;
    outline: none;
    transition: all 350ms linear;

    &:hover {
      // background-color: rgba(184, 184, 184, 0.119);
    }
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
 