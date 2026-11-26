<template>
  <fs-page class="page-my-acme">
    <template #header>
      <div class="title">{{ t("certd.navigation.myAcme") }}</div>
      <div class="sub">{{ t("certd.localCa.acmeUsageHint") }}</div>
    </template>
    <div class="my-acme-body">
      <AcmeUsage />
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { useI18n } from "/src/locales";
import AcmeUsage from "/@/views/sys/local-ca/components/acme-usage.vue";

defineOptions({ name: "MyAcme" });

const { t } = useI18n();
</script>

<style lang="less">
.page-my-acme {
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
  .my-acme-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 12px 20px 20px;
  }
}
.dark .page-my-acme .sub {
  color: rgba(255, 255, 255, 0.45);
}
</style>
