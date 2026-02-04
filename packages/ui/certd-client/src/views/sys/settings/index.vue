<template>
  <fs-page class="page-sys-settings">
    <!--    <template #header>-->
    <!--      <div class="title">系统设置</div>-->
    <!--    </template>-->
    <div class="sys-settings-body md:p-5">
      <a-tabs :active-key="activeKey" type="card" class="sys-settings-tabs" @update:active-key="onChange">
        <a-tab-pane key="base" :tab="t('certd.sys.setting.baseSetting')">
          <SettingBase v-if="activeKey === 'base'" />
        </a-tab-pane>
        <a-tab-pane key="register" :tab="t('certd.sys.setting.registerSetting')">
          <SettingRegister v-if="activeKey === 'register'" />
        </a-tab-pane>
        <a-tab-pane key="oauth" :tab="t('certd.sys.setting.oauthSetting')">
          <SettingOauth v-if="activeKey === 'oauth'" />
        </a-tab-pane>
        <a-tab-pane v-if="settingsStore.isComm" key="payment" :tab="t('certd.sys.setting.paymentSetting')">
          <SettingPayment v-if="activeKey === 'payment'" />
        </a-tab-pane>
        <a-tab-pane key="safe" :tab="t('certd.sys.setting.safeSetting')">
          <SettingSafe v-if="activeKey === 'safe'" />
        </a-tab-pane>
        <a-tab-pane key="captcha" :tab="t('certd.sys.setting.captchaSetting')">
          <SettingCaptcha v-if="activeKey === 'captcha'" />
        </a-tab-pane>
        <a-tab-pane key="pipeline" :tab="t('certd.sys.setting.pipelineSetting')">
          <SettingPipeline v-if="activeKey === 'pipeline'" />
        </a-tab-pane>
        <a-tab-pane key="mode" :tab="t('certd.adminMode')">
          <SettingMode v-if="activeKey === 'mode'" />
        </a-tab-pane>
      </a-tabs>
    </div>
  </fs-page>
</template>

<script setup lang="tsx">
import SettingBase from "/@/views/sys/settings/tabs/base.vue";
import SettingRegister from "/@/views/sys/settings/tabs/register.vue";
import SettingPayment from "/@/views/sys/settings/tabs/payment.vue";
import SettingSafe from "/@/views/sys/settings/tabs/safe.vue";
import SettingCaptcha from "/@/views/sys/settings/tabs/captcha.vue";
import SettingPipeline from "/@/views/sys/settings/tabs/pipeline.vue";
import SettingOauth from "/@/views/sys/settings/tabs/oauth.vue";
import SettingMode from "/@/views/sys/settings/tabs/mode.vue";

import { useRoute, useRouter } from "vue-router";
import { ref } from "vue";
import { useSettingStore } from "/@/store/settings";
import { useI18n } from "/@/locales";
defineOptions({
  name: "SysSettings",
});
const { t } = useI18n();
const settingsStore = useSettingStore();
const activeKey = ref("base");
const route = useRoute();
const router = useRouter();
activeKey.value = (route.query.tab as string) || "base";

function onChange(value: string) {
  // activeKey.value = value;
  // 创建一个新的查询参数对象
  const query: any = {};
  if (value !== "") {
    query.tab = value;
  }
  // 使用`push`方法更新路由，保留其他查询参数不变
  router.push({ path: route.path, query });
}
</script>

<style lang="less">
.page-sys-settings {
  .sys-settings-form {
    width: 900px;
    max-width: 100%;
    padding: 20px;
  }

  .sys-settings-body {
    height: 100%;
    padding-top: 20px;
    .sys-settings-tabs {
      height: 100%;
      display: flex;
      flex-direction: column;
      .ant-tabs-content-holder {
        flex: 1;
        overflow: auto;
      }
    }
  }
}
</style>
