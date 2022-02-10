<template >
  <div v-if="entry.alert" class="wsentry-alert" @mousedown.capture.stop>
    <button class="wsentry-alert-show">
      <AlertCircleOutline />
      <span class="tooltiptext">{{ entry.alert }}</span>
    </button>
  </div>
</template>
 

<script lang="ts">
import { Tippy } from "vue-tippy";
import { AlertCircleOutline } from "mdue";
import { defineComponent } from "vue";
import WorkspaceEntry from "@/core/model/WorkspaceEntry";
export default defineComponent({
  el: ".wsentry-alert",
  components: {
    Tippy,
    AlertCircleOutline,
  },
  name: "wsentryalert",
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
    "entry.alert": function (newValue: boolean, oldValue: boolean) {},
  },
  mounted() {},
  methods: {},
});
</script>

<style scoped lang="scss">
.wsentry-alert {
  transform-origin: left bottom;
  position: absolute;
  left: 100%;
  top: 0;
  pointer-events: all;
  width: auto;
  z-index: 2000;
  display: inline-block;

  // Taken from https://www.w3schools.com/css/css_tooltip.asp

  /* Tooltip text */
  .tooltiptext {
    visibility: hidden;
    min-width: 250px;
    background-color: rgb(128, 128, 128);
    color: #fff;
    text-align: center;
    padding: 5px;
    border-radius: 6px;
    opacity: 0;
    top: 0px;
    left: 105%;
    /* Position the tooltip text - see examples below! */
    position: absolute;
    z-index: 1;
    transition: opacity 0.2s ease-out;
  }
  .tooltiptext::after {
    content: "";
    position: absolute;
    top: 11px;
    left: -18px;
    margin-top: -8px;
    border-width: 10px;
    border-style: solid;
    border-color: transparent rgb(128, 128, 128) transparent transparent;
  }

  /* Show the tooltip text when you mouse over the tooltip container */
  &:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
  }

  button {
    background: transparent;
  }

  svg {
    color: rgb(190, 94, 94);
    pointer-events: none;
    padding: 0;
    margin: 0;
    font-size: 64px;
  }
}
</style>
 