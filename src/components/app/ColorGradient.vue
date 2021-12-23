<template>
  <div ref="el" class="color-gradient-div"></div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import * as _ from "underscore";
import Gradient from "./Gradient";

export default defineComponent({
  name: "ColorGradient",
  props: {
    id: String,
    gradient: { type: Gradient, required: true },
  },
  mounted() {
    let values: string[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const percent = Math.floor(100 * (i / steps));
      values.push(`${this.gradient.getColor(i / steps)} ${percent}%`);
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
  height: 40px;
  margin: 0;
  margin-top: 5px;

  &:hover {
    cursor: pointer;
    border: 3px solid $color-Selection;
  }
}
.gradient-selected {
  border: 2px solid $color-Selection;
}
</style>

 