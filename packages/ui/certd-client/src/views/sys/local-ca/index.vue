<template>
  <fs-page class="page-local-ca">
    <template #header>
      <div class="title">{{ t("certd.localCa.title") }}</div>
      <div class="sub">{{ t("certd.localCa.description") }}</div>
    </template>
    <div class="local-ca-body">
      <a-tabs :active-key="activeTab" type="card" class="local-ca-tabs" @update:active-key="onTabChange">
        <a-tab-pane key="ca" :tab="t('certd.localCa.tabCaManage')">
          <TabCaList v-if="activeTab === 'ca'" />
        </a-tab-pane>
        <a-tab-pane key="permissions" :tab="t('certd.localCa.permissions')">
          <TabPermissions v-if="activeTab === 'permissions'" />
        </a-tab-pane>
        <a-tab-pane key="acme" :tab="t('certd.localCa.tabAcmeService')">
          <TabAcmeService v-if="activeTab === 'acme'" />
        </a-tab-pane>
        <a-tab-pane key="certs" :tab="t('certd.localCa.tabIssuedCerts')">
          <TabIssuedCerts v-if="activeTab === 'certs'" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "/src/locales";
import TabCaList from "./tabs/ca-list.vue";
import TabPermissions from "./tabs/permissions.vue";
import TabAcmeService from "./tabs/acme-service.vue";
import TabIssuedCerts from "./tabs/issued-certs.vue";

defineOptions({
  name: "LocalCaManager",
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const activeTab = ref((route.query.tab as string) || "ca");

function onTabChange(value: string) {
  activeTab.value = value;
  const query: any = { ...route.query };
  delete query.caId;
  if (value !== "ca") {
    query.tab = value;
  } else {
    delete query.tab;
  }
  router.replace({ path: route.path, query });
}
</script>

<style lang="less">
.page-local-ca {
  display: flex;
  min-height: 0;

  .fs-page-content {
    display: flex;
    min-height: 0;
  }

  .title {
    font-size: 18px;
    font-weight: 600;
  }

  .sub {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  .local-ca-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 12px 20px 20px;
  }

  .local-ca-tabs {
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
    }
  }

  .ant-switch-disabled {
    opacity: 0.45;
    cursor: not-allowed;
    background: #d9d9d9;
    &.ant-switch-checked {
      background: #bfbfbf;
    }
  }
}
.dark .page-local-ca {
  .sub {
    color: rgba(255, 255, 255, 0.45);
  }
}
.local-ca-settings {
  width: 100%;
  table-layout: fixed;
  .ant-descriptions-item-content {
    word-break: break-all;
    overflow-wrap: anywhere;
  }
  .fs-copyable {
    max-width: 100%;
    overflow-wrap: anywhere;
  }
}
</style>
