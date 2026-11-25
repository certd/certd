<template>
  <div class="local-ca-tab-issued-certs">
    <CaSelect v-model="caId" @change="onCaChange" />
    <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.issuedCertsHint')" />
    <fs-crud v-if="caId" ref="crudRef" class="issued-certs-crud" v-bind="crudBinding" />
    <a-empty v-else :description="t('certd.localCa.caSelectEmpty')" />
  </div>
</template>

<script lang="tsx" setup>
import { ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";
import CaSelect from "../components/ca-select.vue";
import createCrudOptions from "../crud-issued-certs";
import { useStepUp } from "../use-step-up";

defineOptions({
  name: "LocalCaTabIssuedCerts",
});

const { t } = useI18n();
const { openStepUp } = useStepUp();
const caId = ref<number | undefined>();

const context: any = {
  caIdRef: caId,
  runStepUp: (action: () => Promise<void>) => openStepUp(t("certd.localCa.revokeCertStepUpTitle"), t("certd.localCa.revokeCertStepUpDesc"), action),
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

async function onCaChange() {
  if (caId.value) {
    await crudExpose.doRefresh();
  }
}
</script>

<style lang="less">
.local-ca-tab-issued-certs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  .issued-certs-crud {
    flex: 1;
    min-height: 0;
  }
}
</style>
