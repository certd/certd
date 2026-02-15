<template>
  <fs-page class="page-sys-nettest">
    <template #header>
      <div class="title">
        网络测试
        <span class="sub">测试您的服务器容器网络连接是否正常</span>
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
        <domain-test-card class="test-card" :title="'自定义域名测试'" />
      </div>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import DomainTestCard from "./DomainTestCard.vue";
import ServerInfoCard from "./ServerInfoCard.vue";
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
