<template>
  <fs-icon v-bind="triggerTypeIconBind" />
</template>
<script setup lang="ts">
import { computed } from "vue";

defineOptions({
  name: "TriggerIcon",
});
const props = defineProps({
  triggerType: {
    type: String,
    default: () => {},
  },
});

const triggerTypeIconBind = computed(() => {
  const triggerType = props.triggerType;
  let icon = "hugeicons:tap-05:#ff9900";
  let title = "手动触发";
  if (triggerType === "webhook") {
    icon = "mdi:link-variant:blue";
    title = "Webhook 触发";
  } else if (triggerType === "timer") {
    icon = "mdi:schedule:green";
    title = "定时器触发";
  }
  return {
    icon,
    title,
  };
});
</script>
