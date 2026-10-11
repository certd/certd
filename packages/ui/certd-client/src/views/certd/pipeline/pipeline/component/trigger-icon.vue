<template>
  <fs-icon v-bind="triggerTypeIconBind" />
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "/@/locales";

defineOptions({
  name: "TriggerIcon",
});
const props = defineProps({
  triggerType: {
    type: String,
    default: () => {},
  },
});

const { t } = useI18n();

const triggerTypeIconBind = computed(() => {
  const triggerType = props.triggerType;
  let icon = "hugeicons:tap-05:#ff9900";
  let title = t("certd.pipeline.editor.triggerManually");
  if (triggerType === "webhook") {
    icon = "mdi:link-variant:blue";
    title = t("certd.pipeline.editor.webhookTrigger");
  } else if (triggerType === "timer") {
    icon = "mdi:schedule:green";
    title = t("certd.pipeline.editor.scheduledTrigger");
  }
  return {
    icon,
    title,
  };
});
</script>
