<template>
  <div ref="el" class="slider"></div>
</template>

<script lang="ts">
import * as d3 from "d3";

const gradients: Gradient[] = [];
gradients.push(
  new Gradient((n: number) => {
    let value = n * 255 * 0.3;
    value = 180;
    return `rgb(${value},${value},${value})`;
  }, "default")
);
gradients.push(new Gradient(d3.interpolateWarm, "interpolateWarm"));
gradients.push(new Gradient(d3.interpolatePuRd, "interpolatePuRd", !true));
gradients.push(
  new Gradient(
    d3.interpolateMagma,
    "interpolateMagma",
    !true,
    d3.scaleLinear<number>().domain([0, 1]).clamp(true).range([0.3, 1]),
    [0.3, 1]
  )
);

import { defineComponent } from "vue";
import * as _ from "underscore";
import noUiSlider, { API, PipsMode } from "nouislider";
import { filesizeFormat } from "@/utils/format";
import { Instance } from "@/store/model/app/overview/OverviewDataCache";
import { Feature } from "@/store/model/app/overview/AbstractNodeFeature";
import FolderNode from "@/store/model/implementations/filesystem/FolderNode";
import * as WSUtils from "@/components/app/WorkspaceUtils";
import Gradient from "@/components/app/Gradient";
import { Workspace } from "@/store/model/app/Workspace";
import { AbstractNodeFeatureGradient } from "@/store/model/app/overview/AbstractNodeFeatureView";

export default defineComponent({
  name: Feature.FolderSize,
  props: {
    workspace: {
      type: Workspace,
      required: true,
    },
    model: {
      type: AbstractNodeFeatureGradient,
      required: true,
    },
  },
  data(): { gradientFunction: Gradient } {
    return {
      gradientFunction: gradients[2],
    };
  },
  unmounted() {
    console.log("UNMOUNTED");
  },
  mounted() {
    const sliderDiv = this.$el;

    var slider = noUiSlider.create(sliderDiv, {
      start: [
        this.model.settings.sliderRange[0],
        this.model.settings.sliderRange[1],
      ],
      connect: true,
      behaviour: "drag",
      orientation: "vertical",
      tooltips: {
        to: filesizeFormat,
      },
      margin: 1024 * 1024 * 8,
      range: {
        min: 0, // kb
        "20%": [1024 * 1024 * 32], // mb
        "40%": [1024 * 1024 * 256], // mb
        "60%": [1024 * 1024 * 1024], // gb
        "80%": [1024 * 1024 * 1024 * 16], // gb
        max: [1024 * 1024 * 1024 * 512], // tb
      },
      pips: {
        mode: PipsMode.Range,
        density: 2,
        format: {
          to: filesizeFormat,
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
        this.filterfunc(
          this,
          Feature.FolderSize,
          Number(values[0]),
          Number(values[1])
        );
      }
    );

    this.updateGradient(this.model.settings.gradientId);
  },
  methods: {
    getGradienFunction(name: string): Gradient {
      let gradient: Gradient | undefined = gradients.find((g) => g.id == name);
      gradient = gradient ? gradient : gradients[0];

      return gradient;
    },
    updateGradient(name: string) {
      this.model.settings.gradientId = name;

      const gradient = this.getGradienFunction(name);
      this.gradientFunction = gradient;

      let values: string[] = [];
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
        const percent = Math.floor(100 * (i / steps));
        values.push(`${gradient.getColor(i / steps)} ${percent}%`);
      }

      const style = "linear-gradient( 0deg, " + values.join(", ") + ")";

      let divs: HTMLElement[] = this.$el.getElementsByClassName("noUi-connect");
      divs[0].style.backgroundImage = style;

      this.model.colorFunction = (n: number) => {
        return this.gradientFunction.getColor(n);
      };

      this.filterfunc(
        this,
        Feature.FolderSize,
        Number(this.model.settings.sliderRange[0]),
        Number(this.model.settings.sliderRange[1])
      );
    },
    filterfunc: _.throttle(
      (_this: any, feature: Feature, min: number, max: number) => {
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

        _this.model.colorFunction = (n: number) => {
          return _this.gradientFunction.getColor(n);
        };

        if (Instance.getEngine(_this.workspace.id)) {
          Instance.getEngine(_this.workspace.id).updateNodeColors();
        }
      },
      128
    ),
  },
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

 