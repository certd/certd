<template>
  <fs-page class="page-cert-store">
    <template #header>
      <div class="title">
        {{ t("certd.monitor.certificateRepo.title") }}
        <span class="sub">{{ t("certd.monitor.certificateRepo.sub") }}</span>
      </div>
    </template>
    <div class="cert-store-body">
      <a-tabs v-model:active-key="activeTab" type="card" class="cert-store-tabs">
        <a-tab-pane key="certs" :tab="t('certd.monitor.certificateRepo.title')">
          <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
        </a-tab-pane>
        <a-tab-pane v-if="userStore.localCaAccessible" key="acme" :tab="t('certd.localCa.acmeUsageTab')">
          <AcmeUsage v-if="activeTab === 'acme'" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";
import { useI18n } from "/src/locales";
import { useUserStore } from "/@/store/user";
import AcmeUsage from "/@/views/sys/local-ca/components/acme-usage.vue";

const { t } = useI18n();
const userStore = useUserStore();
const activeTab = ref("certs");

defineOptions({
  name: "CertStore",
});
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { permission: { isProjectPermission: true } } });
useMounted(() => crudExpose.doRefresh());
</script>

<style lang="less">
.page-cert-store {
  display: flex;
  min-height: 0;

  .fs-page-content {
    display: flex;
    min-height: 0;
  }

  .cert-store-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 12px 20px 20px;
  }

  .cert-store-tabs {
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
}
</style>
