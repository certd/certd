<template>
  <a-tooltip :overlay-style="{ maxWidth: '400px' }">
    <template #title>
      <div>
        <div>{{ t("certd.verifyPlan.cnameTip.intro") }}</div>
        <div>{{ t("certd.verifyPlan.cnameTip.step1", { domain: record.domain }) }}</div>
        <div>{{ t("certd.verifyPlan.cnameTip.step2") }}</div>
        <div>{{ t("certd.verifyPlan.cnameTip.step3", { value: record.recordValue }) }}</div>
        <div>
          {{ t("certd.verifyPlan.cnameTip.step4") }}
          <fs-copyable :style="{ color: '#52c41a' }" :model-value="nslookupCmd"></fs-copyable>
          {{ t("certd.verifyPlan.cnameTip.or") }}
          <fs-copyable :style="{ color: '#52c41a' }" :model-value="digCmd"></fs-copyable>
        </div>
        <div>{{ t("certd.verifyPlan.cnameTip.step5") }}</div>
      </div>
    </template>
    <fs-icon class="ml-5 pointer" icon="mingcute:question-line"></fs-icon>
  </a-tooltip>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
const props = defineProps<{
  record: any;
}>();
const { t } = useI18n();

const nslookupCmd = computed(() => {
  return `nslookup -q=txt _acme-challenge.${props.record.domain}`;
});

const digCmd = computed(() => {
  return `dig _acme-challenge.${props.record.domain}`;
});
</script>
