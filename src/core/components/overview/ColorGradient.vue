<template>
  <div ref="el" class="color-gradient-div"></div>
</template>

<script lang="ts">
/**
 * This component displays the Color Gradient of a Gradient object..
 */
import { defineComponent } from "vue";
import * as _ from "underscore";
import Gradient from "@/core/model/fileactivity/overview/Gradient";

export default defineComponent({
  name: "ColorGradient",
  props: {
    id: String,
    gradient: { type: Gradient, required: true },
  },
  mounted() {
    /**
     * Take 5 colors out of the gradient and
     * use them for a css linear gradient background.
     */
    let values: string[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const percent = Math.floor(100 * (i / steps));
      values.push(`${this.gradient.getColor(i / steps)} ${percent}%`);
    }

    const style = "linear-gradient( 270deg, " + values.join(", ") + ")";
    this.$el.style.backgroundImage = style;
  },
});
</script>

<style scoped lang="scss">
@import "@/core/components/styles/variables.scss";

.color-gradient-div {
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  margin: 5px 0 5px 0;
  &:hover {
    cursor: pointer;
    border: 3px solid $color-Selection;
  }
}
.gradient-selected {
  border: 4px solid $color-Selection;
}
</style>

 