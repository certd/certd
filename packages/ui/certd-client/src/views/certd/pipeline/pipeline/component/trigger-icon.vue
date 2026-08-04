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
  let title = "Manual Trigger";
  if (triggerType === "webhook") {
    icon = "mdi:link-variant:blue";
    title = "Webhook Trigger";
  } else if (triggerType === "timer") {
    icon = "mdi:schedule:green";
    title = "Scheduled Trigger";
  }
  return {
    icon,
    title,
  };
});
</script>
