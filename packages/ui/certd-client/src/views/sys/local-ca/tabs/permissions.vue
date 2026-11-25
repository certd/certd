<template>
  <div class="local-ca-tab-permissions">
    <CaSelect v-model="caId" @change="onCaChange" />
    <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.permissionsTabHint')" />
    <LocalCaAccess v-if="caId" :key="caId" :ca-id="caId" :ca-type="selectedCa?.caType" :run-step-up="openStepUp" />
    <a-empty v-if="!caId" :description="t('certd.localCa.caSelectEmpty')" />
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useI18n } from "/src/locales";
import CaSelect from "../components/ca-select.vue";
import LocalCaAccess from "../ca-access.vue";
import { useStepUp } from "../use-step-up";

defineOptions({
  name: "LocalCaTabPermissions",
});

const { t } = useI18n();
const { openStepUp } = useStepUp();
const caId = ref<number | undefined>();
const selectedCa = ref<any>();

function onCaChange(ca: any) {
  selectedCa.value = ca;
}
</script>

<style lang="less">
.local-ca-tab-permissions {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
