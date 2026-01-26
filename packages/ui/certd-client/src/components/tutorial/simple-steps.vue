<template>
  <a-steps :current="3" class="mt-10 simple-steps" size="small" :items="steps" @click="goPipeline"></a-steps>
</template>

<script lang="tsx" setup>
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

type Step = {
  title: string;
  description?: string;
  icon?: any;
};

import { ref } from "vue";
import { mitter } from "/@/utils/util.mitt";

const steps = ref<Step[]>([
  { title: t("certd.steps.createPipeline"), icon: <fs-icon icon="tabler:circle-number-1-filled"></fs-icon> },
  { title: t("certd.steps.addTask"), icon: <fs-icon icon="tabler:circle-number-2-filled"></fs-icon> },
  { title: t("certd.steps.scheduledRun"), icon: <fs-icon icon="tabler:circle-number-3-filled"></fs-icon> },
]);

function goPipeline() {
  mitter.emit("openTutorialModal");
}
</script>
<style lang="less">
.simple-steps {
  .fs-icon {
    font-size: 18px !important;
  }
}
</style>
