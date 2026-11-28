<template>
  <fs-page class="page-local-ca">
    <template #header>
      <div class="title">{{ t("certd.localCa.title") }}</div>
      <div class="sub">{{ t("certd.localCa.description") }}</div>
    </template>
    <div class="local-ca-body">
      <TabCaList />
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { useI18n } from "/src/locales";
import TabCaList from "./tabs/ca-list.vue";

defineOptions({
  name: "LocalCaManager",
});

const { t } = useI18n();
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
.page-local-ca .ant-table-tbody td.ant-table-cell:last-child {
  white-space: nowrap;
  .ant-btn-link {
    padding: 0 4px;
  }
}
.local-ca-row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
  .ant-btn {
    padding: 0 4px;
    height: auto;
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
