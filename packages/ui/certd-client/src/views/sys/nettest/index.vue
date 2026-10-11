<template>
  <fs-page class="page-sys-nettest">
    <template #header>
      <div class="title">
        {{ t("certd.nettest.title") }}
        <span class="sub">{{ t("certd.nettest.helper") }}</span>
      </div>
    </template>
    <div class="nettest-container">
      <!-- 服务端信息 -->
      <server-info-card />

      <!-- 测试区域 -->
      <div class="test-areas flex-wrap md:flex-nowrap">
        <!-- 百度域名测试 (用于对比) -->
        <domain-test-card class="test-card" :domain="'baidu.com'" :port="443" :auto-start="true" />
        <!-- 用户输入域名测试 -->
        <domain-test-card class="test-card" :title="t('certd.nettest.customDomain')" />
      </div>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import DomainTestCard from "./DomainTestCard.vue";
import ServerInfoCard from "./ServerInfoCard.vue";
import { useI18n } from "/@/locales";

const { t } = useI18n();
</script>

<style lang="less">
.page-sys-nettest {
  .nettest-container {
    padding: 16px;
  }

  .test-areas {
    display: flex;
    gap: 16px;
    margin-top: 16px;
  }

  .test-card {
    min-width: 50%;
  }
}
</style>
