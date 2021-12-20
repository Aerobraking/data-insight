<template>
  <div ref="el" class="color-gradient-div"></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { WorkspaceEntryFrame } from "../../store/model/Workspace";
import * as WSUtils from "./WorkspaceUtils";
import { setupEntry, WorkspaceViewIfc } from "./WorkspaceUtils";
import * as _ from "underscore";

interface gradientFunction {}

export default defineComponent({
  name: "ColorGradient",
  props: {
    id: String,
    gradient: { type: Function, required: true },
  },
  mounted() {
    let values: string[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const percent = Math.floor(100 * (i / steps));
      values.push(`${this.gradient(i / steps)} ${percent}%`);
    }

    const style = "linear-gradient( 270deg, " + values.join(", ") + ")";
    this.$el.style.backgroundImage = style;
  },
  methods: {},
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
$color-Selection: rgba(57, 215, 255, 1);

.color-gradient-div {
  box-sizing: border-box;
  width: 100%;
  height: 20px;
  margin: 4px;

  &:hover {
    cursor: pointer;
    border: 2px solid $color-Selection;
  }
}
</style>

 