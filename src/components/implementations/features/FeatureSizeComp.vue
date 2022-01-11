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
  </div>
</template>

<script lang="ts">
import { Tippy } from "vue-tippy";
import { defineComponent } from "vue";
import * as _ from "underscore";
import noUiSlider, { API, PipsMode } from "nouislider"; 
import { Instance } from "@/store/model/app/overview/OverviewDataCache";
import { Feature } from "@/store/model/app/overview/AbstractNodeFeature";
import { Workspace } from "@/store/model/app/Workspace";
import ColorGradient from "@/components/app/ColorGradient.vue";
import { NodeFeatureSize } from "@/store/model/implementations/filesystem/FolderFeatures";
import { CogOutline } from "mdue";
import { AbstractNodeFeatureGradient } from "@/store/model/app/overview/AbstractNodeFeatureView";

export default defineComponent({
  name: Feature.FolderSize,
  components: {
    ColorGradient,
    CogOutline,
    Tippy,
  },
  props: {
    workspace: {
      type: Workspace,
      required: true,
    },
    model: {
      type: AbstractNodeFeatureGradient as any,
      required: true,
    },
  },
  data(): {
    tempGradientId: string | undefined;
  } {
    return {
      tempGradientId: undefined,
    };
  },
  unmounted() {},
  mounted() {
    const sliderDiv = this.$el.getElementsByClassName("slider")[0];

    var slider = noUiSlider.create(sliderDiv, {
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

    slider.on(
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
        this.filterfunc(this);
      }
    );

    this.updateGradient(this.model.settings.gradientId);
  },
  methods: {
    restoreGradient() {
      if (
        this.tempGradientId &&
        this.tempGradientId != this.model.settings.gradientId
      ) {
        this.updateGradient(this.tempGradientId);
      }
    },
    updateGradient(name: string, temp: boolean = false) {
      if (temp) this.tempGradientId = this.model.settings.gradientId;
      if (!temp) this.tempGradientId = undefined;
      const gradient = this.model.setGradienFunction(name);

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
      /**
       * Sobald sich die Werte ändern, was eigentlich nur passiert wenn der filter angepasst wird? Dann ein event firen.
       *
       * Das muss dann von allen Files aufgegriffen werden um ihre Farbe zu aktualisieren.
       */
      // WSUtils.Dispatcher.instance.featureEvent(
      //   stats,
      //   Number(min),
      //   Number(max),
      //   _this.gradientFunction.getColor
      // );

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
.gradient-feature-view {
  height: 100%;
  transform-origin: top right;
  transform: scale(0.8);
  h3 {
    white-space: nowrap;
    margin: 5px;
  }
  button {
    margin-left: -6px;
    margin-bottom: 15px;
  }
}

.slider {
  height: 100%;
  transform-origin: top right;
  transform: scale(0.8);
}
</style>

 