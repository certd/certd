<template>
  <fs-page class="page-security-monitor"
    ><div class="security-monitor">
      <header class="security-header">
        <div class="security-heading">
          <div class="security-mark" :class="securityStatus">{{ securityStatus === "normal" ? "✓" : "!" }}</div>
          <h1>{{ t("certd.navigation.sysResources.securityMonitor") }}</h1>
          <p class="ml-4">{{ t("certd.sys.securityMonitor.description") }}</p>
        </div>
        <div class="security-header__actions">
          <a-button :loading="state.loading" :disabled="Boolean(state.savingSetting)" @click="refresh"
            ><template #icon><ReloadOutlined /></template>{{ t("certd.sys.securityMonitor.refresh") }}</a-button
          >
        </div>
      </header>
      <section class="security-overview">
        <div>
          <span>72 小时风险记录</span><strong>{{ state.summary.riskCount ?? "-" }}</strong
          ><small>风险统计窗口</small>
        </div>
        <div>
          <span>当前封禁 IP</span><strong>{{ state.summary.ipBanCount ?? "-" }}</strong
          ><small>可手动解除</small>
        </div>
        <div>
          <span>待处理风险</span><strong>{{ state.summary.pendingRiskCount ?? "-" }}</strong
          ><small>本站整体状态依据</small>
        </div>
        <div>
          <span>72 小时可疑流水线</span><strong>{{ state.summary.suspiciousPipelineCount ?? "-" }}</strong
          ><small>风险统计窗口</small>
        </div>
        <div class="overview-state" :class="securityStatus">
          <div class="overview-status">
            <b>{{ securityStatusLabel }}</b>
            <small>{{ t("certd.sys.securityMonitor.statusDescription") }} · {{ updatedLabel }}</small>
          </div>
          <div v-if="settingStore.isPlus" class="detection-settings">
            <div class="detection-setting">
              <span>{{ t("certd.sys.securityMonitor.urlScanEnabled") }}</span>
              <a-switch
                :checked="state.detectionSettings.urlScanEnabled"
                :disabled="settingsDisabled"
                :loading="state.savingSetting === 'urlScanEnabled'"
                :aria-label="t('certd.sys.securityMonitor.urlScanEnabled')"
                @change="checked => saveDetectionSetting('urlScanEnabled', checked)"
              />
            </div>
            <div class="detection-setting">
              <span>{{ t("certd.sys.securityMonitor.suspiciousPipelineEnabled") }}</span>
              <a-switch
                :checked="state.detectionSettings.suspiciousPipelineEnabled"
                :disabled="settingsDisabled"
                :loading="state.savingSetting === 'suspiciousPipelineEnabled'"
                :aria-label="t('certd.sys.securityMonitor.suspiciousPipelineEnabled')"
                @change="checked => saveDetectionSetting('suspiciousPipelineEnabled', checked)"
              />
            </div>
          </div>
        </div>
      </section>
      <section v-if="settingStore.isPlus" class="security-workspace">
        <a-tabs v-model:active-key="activeSecurityTab" class="security-workspace-tabs">
          <a-tab-pane key="risks" tab="风险记录">
            <SecurityRiskTable ref="riskTableRef" class="table-wrapper" @changed="refresh" />
          </a-tab-pane>
          <a-tab-pane key="bans" tab="封禁管理">
            <SecurityBanManager ref="banTableRef" class="table-wrapper" @changed="refresh" />
          </a-tab-pane>
          <a-tab-pane key="allows" tab="白名单管理">
            <SecurityAllowManager ref="allowTableRef" class="table-wrapper" @changed="refresh" />
          </a-tab-pane>
        </a-tabs>
      </section>
      <section v-else class="security-locked">
        <div class="locked-mark" :class="{ risk: true }">!</div>
        <p class="flex">升级专业版可查看具体风险记录和处置数据 <vip-button class="ml-10" mode="button" /></p>
      </section></div
  ></fs-page>
</template>
<script lang="tsx" setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ReloadOutlined } from "@ant-design/icons-vue";
import { notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { useSettingStore } from "/@/store/settings";
import permissionUtil from "/@/plugin/permission/util.permission";
import { SecurityDetectionSettings, SecurityMonitorSummary, securityMonitorApi } from "./api";
import SecurityBanManager from "./ban-manager.vue";
import SecurityAllowManager from "./allow-manager.vue";
import SecurityRiskTable from "./risk-records-table.vue";
import { mitter } from "/@/utils/util.mitt";
const { t } = useI18n();
const settingStore = useSettingStore();
const riskTableRef = ref<{ refresh: () => Promise<void> }>();
const banTableRef = ref<{ refresh: () => Promise<void> }>();
const allowTableRef = ref<{ refresh: () => Promise<void> }>();
const activeSecurityTab = ref("risks");
const state = reactive({
  summary: { riskCount: 0, pendingRiskCount: 0, suspiciousPipelineCount: 0, ipBanCount: 0, overallStatus: "normal", hasRecentRisk: false } as SecurityMonitorSummary,
  loading: false,
  updatedAt: 0,
  detectionSettings: { urlScanEnabled: true, suspiciousPipelineEnabled: true } as SecurityDetectionSettings,
  settingsLoaded: false,
  savingSetting: null as keyof SecurityDetectionSettings | null,
});
const settingsDisabled = computed(() => !state.settingsLoaded || state.loading || Boolean(state.savingSetting) || !permissionUtil.hasPermissions("sys:settings:edit"));

async function saveDetectionSetting(field: keyof SecurityDetectionSettings, checked: boolean | string | number) {
  if (settingsDisabled.value || typeof checked !== "boolean") {
    return;
  }
  state.savingSetting = field;
  try {
    state.detectionSettings = await securityMonitorApi.saveDetectionSettings({ [field]: checked });
    notification.success({ message: t("certd.sys.securityMonitor.saveSettingsSuccess") });
  } catch (error: any) {
    notification.error({ message: t("certd.sys.securityMonitor.saveSettingsError"), description: error.message });
  } finally {
    state.savingSetting = null;
  }
}

const securityStatus = computed(() => state.summary.overallStatus || (state.summary.hasRecentRisk ? "warning" : "normal"));
const securityStatusLabel = computed(() => {
  if (securityStatus.value === "critical") {
    return t("certd.sys.securityMonitor.statusCritical");
  }
  if (securityStatus.value === "warning") {
    return t("certd.sys.securityMonitor.statusWarning");
  }
  return t("certd.sys.securityMonitor.statusNormal");
});
const updatedLabel = computed(() => (state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString("zh-CN") : "--:--:--"));
async function refresh() {
  state.loading = true;
  try {
    state.summary = await securityMonitorApi.summary();
    state.updatedAt = Date.now();
    if (settingStore.isPlus) {
      state.settingsLoaded = false;
      state.detectionSettings = await securityMonitorApi.getDetectionSettings();
      state.settingsLoaded = true;
    }
    if (settingStore.isPlus) {
      await riskTableRef.value?.refresh();
      await banTableRef.value?.refresh();
      await allowTableRef.value?.refresh();
    }
  } catch (error: any) {
    notification.error({ message: t("certd.sys.securityMonitor.loadMonitorError"), description: error.message });
  } finally {
    state.loading = false;
  }
}
onMounted(async () => {
  await refresh();
});
function openVipModal() {
  mitter.emit("openVipModal");
}
</script>
<style lang="less">
.page-security-monitor {
  .ant-tabs-nav {
    margin-bottom: 0;
  }
  .ant-tabs-content {
    height: 100%;
    .ant-tabs-tabpane {
      height: 100%;

      .table-wrapper {
        height: 100%;
      }
    }
  }

  .security-monitor {
    display: flex;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
    padding: 14px;
    color: #172033;
    background: #f6f8fb;
  }

  .security-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .security-header__actions {
    display: flex;
    gap: 8px;
  }

  .security-heading {
    display: flex;
    align-items: center;
    gap: 14px;

    h1 {
      margin: 0;
      font-size: 22px;
    }

    p {
      margin: 4px 0 0;
      color: #8490a3;
      font-size: 13px;
    }
  }

  .security-mark,
  .locked-mark {
    display: grid;
    place-items: center;
    color: #fff;
    background: #16a36b;
  }

  .security-mark {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    font-size: 22px;

    &.critical {
      background: #e54b4b;
    }

    &.warning {
      background: #e5a100;
    }
  }

  .security-overview {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(280px, 1.6fr);
    overflow: hidden;
    margin: 14px 0;
    border: 1px solid #e3e9f0;
    border-radius: 12px;
    background: #fff;

    > div {
      padding: 20px 24px;
      border-right: 1px solid #edf0f4;
    }

    span,
    small {
      display: block;
      color: #8691a3;
      font-size: 12px;
    }

    strong {
      display: block;
      margin: 8px 0 3px;
      font-size: 29px;
    }
  }

  .overview-state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    color: #16885d;

    &.critical {
      color: #d94343;
    }

    &.warning {
      color: #b77900;
    }
  }

  .detection-settings {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .detection-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    span {
      color: #172033;
    }
  }

  .security-workspace,
  .security-workspace-tabs {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
  }

  .security-workspace {
    overflow: hidden;
    border: 1px solid #e3e9f0;
    border-radius: 14px;
    background: #fff;
  }

  .security-workspace-tabs {
    .ant-tabs-tab:first-child {
      margin-left: 20px;
    }

    :deep(.ant-tabs-content),
    :deep(.ant-tabs-tabpane) {
      height: 100%;
      min-height: 0;
    }

    :deep(.ant-tabs-nav) {
      flex: none;
      margin: 0;
      padding: 0 24px;
    }

    :deep(.ant-tabs-content-holder) {
      min-height: 0;
      flex: 1;
    }
  }

  .security-locked {
    display: flex;
    min-height: 260px;
    flex: 1;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    border: 1px solid #e3e9f0;
    border-radius: 14px;
    background: #fff;

    strong {
      font-size: 18px;
    }

    p {
      margin: 8px 0 0;
      color: #8490a3;
      font-size: 13px;
    }
  }

  .locked-mark {
    width: 54px;
    height: 54px;
    margin-bottom: 14px;
    border-radius: 50%;
    font-size: 26px;

    &.risk {
      background: #e54b4b;
    }
  }

  .dark & {
    .security-monitor {
      color: rgba(255, 255, 255, 0.85);
      background: #141414;
    }

    .security-overview,
    .security-workspace,
    .security-locked {
      border-color: #303030;
      background: #1f1f1f;
    }

    .security-overview > div {
      border-color: #303030;
    }

    .detection-setting span {
      color: rgba(255, 255, 255, 0.85);
    }
  }

  @media (max-width: 900px) {
    .security-overview {
      grid-template-columns: repeat(2, 1fr);
    }

    .security-monitor {
      padding: 18px 12px;
    }
  }
}
</style>
