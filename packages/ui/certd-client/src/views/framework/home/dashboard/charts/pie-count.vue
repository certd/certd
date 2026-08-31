<template>
  <v-chart class="chart" :option="option" autoresize />
</template>

<script setup lang="ts">
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { PieChart } from "echarts/charts";
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from "echarts/components";
import VChart, { THEME_KEY } from "vue-echarts";
import { computed, provide, defineProps } from "vue";
import { usePreferences } from "/@/vben/preferences";
import { ChartItem } from "./d";

use([CanvasRenderer, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent]);

provide(THEME_KEY, "");

const props = defineProps<{
  data: ChartItem[];
}>();
const { isDark } = usePreferences();

const option = computed(() => ({
  color: ["#91cc75", "#73c0de", "#ee6666", "#fac858", "#5470c6", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc", "#5470c6"],
  tooltip: {
    trigger: "item",
    backgroundColor: isDark.value ? "rgba(35, 38, 45, 0.96)" : "rgba(255, 255, 255, 0.96)",
    borderColor: isDark.value ? "rgba(255, 255, 255, 0.2)" : "#d9d9d9",
    textStyle: {
      color: isDark.value ? "rgba(242, 242, 242, 0.92)" : "#333",
    },
  },
  legend: {
    orient: "vertical",
    bottom: "5%",
    left: "left",
    textStyle: {
      color: isDark.value ? "rgba(242, 242, 242, 0.85)" : "#555",
    },
    inactiveColor: isDark.value ? "rgba(242, 242, 242, 0.35)" : "#ccc",
  },
  grid: {
    top: "20px",
    left: "20px",
    right: "20px",
    bottom: "10px",
    containLabel: true,
  },
  series: [
    {
      center: ["60%", "50%"],
      name: "状态",
      type: "pie",
      radius: ["30%", "70%"],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 0,
        borderColor: "#fff",
        borderWidth: 1,
      },
      label: {
        show: false,
        position: "center",
      },
      emphasis: {
        label: {
          show: false,
          fontSize: 18,
          fontWeight: "bold",
        },
      },
      labelLine: {
        show: false,
      },
      data: props.data,
    },
  ],
}));
</script>

<style lang="less">
.chart {
}
</style>
