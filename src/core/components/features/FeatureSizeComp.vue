<template>
  <div class="gradient-feature-view">
    <tippy
      :trigger="'click'"
      :interactiveBorder="10"
      delay="0"
      :placement="'left-end'"
      :offset="[-25, 40]"
      :zIndex="9950"
      :interactive="true"
    >
      <button>
        <CogOutline />
      </button>

      <template #content>
        <h3>Gradient Style</h3>
        <ColorGradient
          v-for="e in model.gradients"
          :class="{ 'gradient-selected': e.id === model.settings.gradientId }"
          :key="e.id"
          @mouseup="updateGradient(e.id)"
          :id="e.id"
          :gradient="e"
        />
      </template>
    </tippy>

    <div ref="el" class="slider"></div>
    <tippy :interactiveBorder="10" :placement="'left'" :offset="[0, 20]">
      <button
        class="fit-range"
        :class="{ 'button-active': model.settings.autoSetRange }"
        @click.ctrl.left.exact="fitRangeClicked(true)"
        @click.left.exact="fitRangeClicked()"
      >
        <ArrowExpandVertical />
      </button>
      <template #content> Fit Range to (selected) Data </template>
    </tippy>
  </div>
</template>

<script lang="ts">
import { Tippy } from "vue-tippy";
import { defineComponent } from "vue";
import _ from "underscore";
import noUiSlider, { API, PipsMode } from "nouislider";
import ColorGradient from "@/core/components/overview/ColorGradient.vue";
import { CogOutline, ArrowExpandVertical } from "mdue";
import { AbstractNode } from "@/core/model/workspace/overview/AbstractNode";
import { FeatureType } from "@/core/model/workspace/overview/FeatureType";
import { AbstractFeatureGradient } from "@/core/model/workspace/overview/AbstractFeature";
import { Workspace } from "@/core/model/workspace/Workspace";
import { Instance } from "@/core/model/workspace/overview/OverviewDataCache";

export default defineComponent({
  name: FeatureType.FolderSize,
  components: {
    ColorGradient,
    ArrowExpandVertical,
    CogOutline,
    Tippy,
  },
  props: {
    workspace: {
      type: Workspace,
      required: true,
    },
    selection: {
      type: AbstractNode as any | undefined,
      required: false,
    },
    model: {
      type: AbstractFeatureGradient as any,
      required: true,
    },
  },
  watch: {
    "workspace.overview.featureActive": function (
      newValue: FeatureType | undefined,
      oldValue: FeatureType | undefined
    ) {
      this.updateFeatureStatus();
    },
  },
  data(): {
    tempGradientId: string | undefined;
    slider: any;
    sliderDiv: HTMLDivElement | undefined;
    fitRangeTimer: NodeJS.Timeout | undefined;
  } {
    return {
      sliderDiv: undefined,
      fitRangeTimer: undefined,
      slider: undefined,
      tempGradientId: undefined,
    };
  },
  mounted() {
    this.sliderDiv = this.$el.getElementsByClassName("slider")[0];

    this.slider = noUiSlider.create(this.sliderDiv as any, {
      start: [
        this.model.settings.sliderRange[0],
        this.model.settings.sliderRange[1],
      ],
      connect: true,
      behaviour: "drag",
      orientation: "vertical",
      tooltips: {
        to: this.model.formatter,
      },
      margin: this.model.margin,
      range: this.model.range,
      pips: {
        mode: PipsMode.Range,
        density: 2,
        format: {
          to: this.model.formatter,
        },
      },
    });

    this.slider.on(
      "update.one",
      (
        values: (number | string)[],
        handleNumber: number,
        unencoded: number[],
        tap: boolean,
        locations: number[],
        slider: API
      ) => {
        this.model.settings.sliderRange = values as [number, number];
        this.sendSettingsToEngine();
        this.filterfunc(this);
      }
    );

    this.updateGradient(this.model.settings.gradientId, false);

    this.updateFeatureStatus();
  },
  methods: {
    updateFeatureStatus() {
      const f: FeatureType | undefined = this.workspace.overview.featureActive;

      if (this.fitRangeTimer) clearTimeout(this.fitRangeTimer);

      if (
        f == this.model.id &&
        (this.model as AbstractFeatureGradient).settings.autoSetRange
      ) {
        this.sliderDiv?.setAttribute("disabled", "true");
        this.fitRangeTimer = setInterval(() => {
          this.fitRange();
        }, 500);
      } else {
        this.sliderDiv?.removeAttribute("disabled");
        this.fitRangeTimer = undefined;
      }
    },
    fitRangeClicked(toggle: boolean | undefined = undefined) {
      toggle == undefined ? (toggle = false) : 0;

      (this.model as AbstractFeatureGradient).settings.autoSetRange = toggle
        ? !(this.model as AbstractFeatureGradient).settings.autoSetRange
        : false;

      this.updateFeatureStatus();

      if (!(this.model as AbstractFeatureGradient).settings.autoSetRange) {
        this.fitRange();
      }
    },
    fitRange() {
      let min = Infinity,
        max = -Infinity;
      const data = Instance.getData(this);

      const checkValue = (n: AbstractNode) => {
        const v = this.model.getGradientValue(n, n.tree);
        if (data.length > 1 || !n.isRoot()) {
          // ignore the root when we only have one tree
          v != undefined && v > 0 && v < min ? (min = v) : "";
          v != undefined && v > 0 && v > max ? (max = v) : "";
        }
      };

      if (this.selection != undefined) {
        [...(this.selection as AbstractNode).getDescendants()].forEach((n) =>
          checkValue(n)
        );
      } else {
        data.forEach((s) => s.nodes.forEach((n) => checkValue(n)));
      }

      if (data.length == 0 || (min == Infinity && max == -Infinity)) return;

      min < this.model.rangeValues[0] ? (min = this.model.rangeValues[0]) : "";
      max > this.model.rangeValues[this.model.rangeValues.length - 1]
        ? (max = this.model.rangeValues[this.model.rangeValues.length - 1])
        : "";

      this.slider.set([min, max]);

      if (Instance.getEngine(this)) {
        Instance.getEngine(this).updateNodeColors();
      }
    },
    restoreGradient() {
      if (
        this.tempGradientId &&
        this.tempGradientId != this.model.settings.gradientId
      ) {
        this.updateGradient(this.tempGradientId);
      }
    },
    sendSettingsToEngine() {
      if(this.model.id ==  this.workspace.overview.featureActive)
      Instance.getEngine(this.workspace.id).featureRenderer.settings = JSON.parse(
        JSON.stringify(this.model.settings)
      );
    },
    updateGradient(
      name: string,
      sendToRender: boolean = true,
      temp: boolean = false
    ) {
      if (temp) this.tempGradientId = this.model.settings.gradientId;
      if (!temp) this.tempGradientId = undefined;

      // this updates the gradient id in the settings
      const gradient = this.model.setGradienFunction(name);
      if (sendToRender) this.sendSettingsToEngine();

      let values: string[] = [];
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const percent = Math.floor(100 * (i / steps));
        values.push(`${gradient.getColor(i / steps)} ${percent}%`);
      }

      const style = "linear-gradient( 0deg, " + values.join(", ") + ")";

      let divs: HTMLElement[] = this.$el.getElementsByClassName("noUi-connect");
      divs[0].style.backgroundImage = style;

      this.filterfunc(this);
    },
    filterfunc: _.throttle((_this: any) => { 

      if (Instance.getEngine(_this.workspace.id)) {
        Instance.getEngine(_this.workspace.id).updateNodeColors();
      }
    }, 128),
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
$color-Selection: rgba(57, 215, 255, 1);
.fit-range {
  margin-top: 4px;
}
.gradient-feature-view {
  height: 80%;
  transform-origin: top right;
  transform: scale(0.9);
  h3 {
    white-space: nowrap;
    margin: 5px;
  }
  button {
    margin-left: -9px;
    margin-bottom: 15px;
  }
}

.slider {
  height: 80%;
  transform-origin: top right;
  // transform: scale(0.8);
}
</style>

 