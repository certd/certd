<template>
  <a-select mode="tags" readonly :value="modelValue" />
  <div>{{ errorRef }}</div>
</template>

<script setup lang="ts">
import { inject, ref, watch } from "vue";

defineOptions({
  name: "CertDomainsGetter"
});

const props = defineProps<{
  inputKey?: string;
  modelValue?: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": any;
}>();

const pipeline: any = inject("pipeline");

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
function getDomainFromPipeline(inputKey: string) {
  if (!inputKey) {
    errorRef.value = "请先选择域名证书";
    return;
  }
  const targetStepId = inputKey.split(".")[1];
  const certStep = findStepFromPipeline(targetStepId);
  if (!certStep) {
    errorRef.value = "找不到目标步骤，请先选择域名证书";
    return;
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
    immediate: true
  }
);
</script>

<style lang="less"></style>
