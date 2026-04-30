<template>
  <div class="cert-domains-getter">
    <div>
      <a-tag v-for="item of modelValue" :key="item" type="success" class="m-3">{{ item }}</a-tag>
    </div>
    <div class="helper">{{ errorRef }}</div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, watch } from "vue";
import { useI18n } from "/@/locales";

defineOptions({
  name: "CertDomainsGetter",
});

const props = defineProps<{
  inputKey?: string;
  modelValue?: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": any;
}>();

const pipeline: any = inject("pipeline");
const { t } = useI18n();

function findStepFromPipeline(targetStepId: string) {
  for (const stage of pipeline.value.stages) {
    for (const task of stage.tasks) {
      for (const step of task.steps) {
        if (step.id === targetStepId) {
          return step;
        }
      }
    }
  }
}

const errorRef = ref("");
function getStepIdFromInputKey(inputKey: string) {
  if (!inputKey) {
    errorRef.value = t("certd.pluginCommon.selectCertFirst");
    return;
  }
  return inputKey.split(".")[1];
}
function getDomainFromPipeline(inputKey: string) {
  let targetStepId = getStepIdFromInputKey(inputKey);
  let certStep = findStepFromPipeline(targetStepId);
  if (!certStep) {
    errorRef.value = t("certd.pluginCommon.targetStepNotFound");
    return;
  }

  const firstLevelValue = certStep.input.cert;
  if (firstLevelValue && typeof firstLevelValue === "string" && firstLevelValue.indexOf(".") > 0) {
    targetStepId = getStepIdFromInputKey(firstLevelValue);
    certStep = findStepFromPipeline(targetStepId);
    if (!certStep) {
      errorRef.value = t("certd.pluginCommon.targetStepNotFound");
      return;
    }
  }

  const domain = certStep.input["domains"];
  emit("update:modelValue", domain);
}

watch(
  () => {
    return props.inputKey;
  },
  (inputKey: string) => {
    getDomainFromPipeline(inputKey);
  },
  {
    immediate: true,
  }
);
</script>

<style lang="less"></style>
