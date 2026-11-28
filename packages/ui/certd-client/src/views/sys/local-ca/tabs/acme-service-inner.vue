<template>
  <div class="local-ca-acme-service-inner">
    <a-tabs v-model:active-key="innerTab" type="card" size="small" class="acme-service-tabs" @change="refreshInner">
      <a-tab-pane key="access" :tab="t('certd.localCa.acmeAccessTitle')">
        <LocalCaAcmeAccess
          v-if="innerTab === 'access'"
          :key="'access-' + caId"
          :ca-id="caId"
          :run-step-up="action => openStepUp(t('certd.localCa.acmeAccessStepUpTitle'), t('certd.localCa.acmeAccessStepUpDesc'), action)"
        />
      </a-tab-pane>
      <a-tab-pane key="eab" :tab="t('certd.localCa.eabManagerTitle')">
        <fs-crud v-if="innerTab === 'eab'" ref="eabCrudRef" class="acme-service-crud" v-bind="eabCrudBinding" />
      </a-tab-pane>
      <a-tab-pane key="accounts" :tab="t('certd.localCa.acmeAccounts')">
        <AccountsTable v-if="innerTab === 'accounts'" ref="accountsTableRef" :ca-id="caId" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="tsx" setup>
import { computed, nextTick, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";
import LocalCaAcmeAccess from "../acme-access.vue";
import createEabCrudOptions from "../crud-eab";
import AccountsTable from "../components/accounts-table.vue";
import { useLocalCaDialogs } from "../use";
import { useStepUp } from "../use-step-up";

defineOptions({
  name: "LocalCaAcmeServiceInner",
});

const props = defineProps<{ caId: number }>();

const { t } = useI18n();
const { openStepUp } = useStepUp();
const caIdRef = computed(() => props.caId);
const innerTab = ref("access");

const { openCreateEab, openEditEab, openLeakRevoke, openAssignAccount } = useLocalCaDialogs({});
const eabContext: any = {
  caIdRef,
  openCreateEab,
  openEditEab,
  openLeakRevoke,
  openAssignAccount,
  runStepUp: (action: () => Promise<void>) => openStepUp(t("certd.localCa.eabStepUpTitle"), t("certd.localCa.eabStepUpDesc"), action),
};
const { crudBinding: eabCrudBinding, crudRef: eabCrudRef, crudExpose: eabCrudExpose } = useFs({ createCrudOptions: createEabCrudOptions, context: eabContext });
const accountsTableRef = ref<any>();

async function refreshInner() {
  if (!props.caId) {
    return;
  }
  await nextTick();
  if (innerTab.value === "eab") {
    await eabCrudExpose.doRefresh();
  } else if (innerTab.value === "accounts") {
    await accountsTableRef.value?.load?.();
  }
}
</script>

<style lang="less">
.local-ca-acme-service-inner {
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
