<template>
  <div class="local-ca-tab-acme-service">
    <CaSelect v-model="caId" acme-only @change="onCaChange" />
    <template v-if="caId">
      <a-tabs v-model:active-key="innerTab" class="acme-service-tabs" @change="refreshInner">
        <a-tab-pane key="access" :tab="t('certd.localCa.acmeAccessTitle')">
          <LocalCaAcmeAccess v-if="innerTab === 'access'" :key="caId" :ca-id="caId" :run-step-up="action => openStepUp(t('certd.localCa.acmeAccessStepUpTitle'), t('certd.localCa.acmeAccessStepUpDesc'), action)" />
        </a-tab-pane>
        <a-tab-pane key="eab" :tab="t('certd.localCa.eabManagerTitle')">
          <fs-crud v-if="innerTab === 'eab'" ref="eabCrudRef" class="acme-service-crud" v-bind="eabCrudBinding" />
        </a-tab-pane>
        <a-tab-pane key="accounts" :tab="t('certd.localCa.acmeAccounts')">
          <fs-crud v-if="innerTab === 'accounts'" ref="accountsCrudRef" class="acme-service-crud" v-bind="accountsCrudBinding" />
        </a-tab-pane>
      </a-tabs>
    </template>
    <a-empty v-else :description="t('certd.localCa.acmeCaSelectEmpty')" />
  </div>
</template>

<script lang="tsx" setup>
import { nextTick, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";
import CaSelect from "../components/ca-select.vue";
import LocalCaAcmeAccess from "../acme-access.vue";
import createEabCrudOptions from "../crud-eab";
import createAccountsCrudOptions from "../crud-acme-accounts";
import { useLocalCaDialogs } from "../use";
import { useStepUp } from "../use-step-up";

defineOptions({
  name: "LocalCaTabAcmeService",
});

const { t } = useI18n();
const { openStepUp } = useStepUp();
const caId = ref<number | undefined>();
const innerTab = ref("access");

const { openCreateEab } = useLocalCaDialogs({});
const eabContext: any = {
  caIdRef: caId,
  openCreateEab,
  runStepUp: (action: () => Promise<void>) => openStepUp(t("certd.localCa.eabStepUpTitle"), t("certd.localCa.eabStepUpDesc"), action),
};
const accountsContext: any = { caIdRef: caId };
const { crudBinding: eabCrudBinding, crudRef: eabCrudRef, crudExpose: eabCrudExpose } = useFs({ createCrudOptions: createEabCrudOptions, context: eabContext });
const { crudBinding: accountsCrudBinding, crudRef: accountsCrudRef, crudExpose: accountsCrudExpose } = useFs({ createCrudOptions: createAccountsCrudOptions, context: accountsContext });

async function refreshInner() {
  if (!caId.value) {
    return;
  }
  await nextTick();
  if (innerTab.value === "eab") {
    await eabCrudExpose.doRefresh();
  } else if (innerTab.value === "accounts") {
    await accountsCrudExpose.doRefresh();
  }
}

async function onCaChange() {
  await refreshInner();
}
</script>

<style lang="less">
.local-ca-tab-acme-service {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  .acme-service-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;

    .ant-tabs-content-holder,
    .ant-tabs-content,
    .ant-tabs-tabpane {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .ant-tabs-tabpane {
      flex-direction: column;
      overflow: auto;
    }
  }

  .acme-service-crud {
    flex: 1;
    min-height: 0;
  }
}
</style>
