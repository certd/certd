<template>
  <fs-page class="page-security-monitor"
    ><div class="security-monitor">
      <header class="security-header">
        <div class="security-heading">
          <div class="security-mark" :class="{ risk: hasRecentRisk }">{{ hasRecentRisk ? "!" : "✓" }}</div>
          <h1>{{ t("certd.navigation.sysResources.securityMonitor") }}</h1>
          <p class="ml-4">{{ t("certd.sys.securityMonitor.description") }}</p>
        </div>
        <div class="security-header__actions">
          <a-button :loading="state.loading" @click="refresh"
            ><template #icon><ReloadOutlined /></template>{{ t("certd.sys.securityMonitor.refresh") }}</a-button
          >
        </div>
      </header>
      <section class="security-overview">
        <div>
          <span>72 小时风险记录</span><strong>{{ state.summary.riskCount }}</strong
          ><small>本站整体状态依据</small>
        </div>
        <div>
          <span>当前封禁 IP</span><strong>{{ state.summary.ipBanCount }}</strong
          ><small>可手动解除</small>
        </div>
        <div>
          <span>72 小时可疑流水线</span><strong>{{ state.summary.suspiciousPipelineCount }}</strong
          ><small>风险统计窗口</small>
        </div>
        <div class="overview-state" :class="{ danger: hasRecentRisk }">
          <b>{{ hasRecentRisk ? "检测到安全风险" : "系统安全" }}</b
          ><small>依据最近 72 小时记录 · {{ updatedLabel }}</small>
        </div>
      </section>
      <section v-if="settingStore.isPlus" class="security-workspace">
        <a-tabs v-model:active-key="activeSecurityTab" class="security-workspace-tabs">
          <a-tab-pane key="risks" tab="风险记录">
            <SecurityRiskTable ref="riskTableRef" class="table-wrapper" @changed="refresh" />
          </a-tab-pane>
          <a-tab-pane key="bans" tab="封禁管理">
            <SecurityBanManager class="table-wrapper" @changed="refresh" />
          </a-tab-pane>
          <a-tab-pane key="allows" tab="白名单管理">
            <SecurityAllowManager class="table-wrapper" @changed="refresh" />
          </a-tab-pane>
        </a-tabs>
      </section>
      <section v-else class="security-locked">
        <div class="locked-mark" :class="{ risk: hasRecentRisk }">{{ hasRecentRisk ? "!" : "✓" }}</div>
        <strong>{{ hasRecentRisk ? "检测到安全风险" : "系统安全" }}</strong>
        <p>风险统计和风险记录日志为专业版功能</p>
      </section>
    </div></fs-page
  >
</template>
<script lang="tsx" setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ReloadOutlined } from "@ant-design/icons-vue";
import { useI18n } from "/src/locales";
import { useSettingStore } from "/@/store/settings";
import { SecurityMonitorSummary, securityMonitorApi } from "./api";
import SecurityBanManager from "./ban-manager.vue";
import SecurityAllowManager from "./allow-manager.vue";
import SecurityRiskTable from "./risk-records-table.vue";
const { t } = useI18n();
const settingStore = useSettingStore();
const riskTableRef = ref<{ refresh: () => Promise<void> }>();
const activeSecurityTab = ref("risks");
const state = reactive({
  summary: { riskCount: 0, suspiciousPipelineCount: 0, ipBanCount: 0, hasRecentRisk: false } as SecurityMonitorSummary,
  loading: false,
  updatedAt: 0,
});
const hasRecentRisk = computed(() => state.summary.hasRecentRisk);
const updatedLabel = computed(() => (state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString("zh-CN") : "--:--:--"));
async function refresh() {
  state.loading = true;
  try {
    state.summary = await securityMonitorApi.summary();
    state.updatedAt = Date.now();
    await riskTableRef.value?.refresh();
  } finally {
    state.loading = false;
  }
}
onMounted(async () => {
  if (!settingStore.isPlus) {
    settingStore.checkPlus();
  }
  state.summary = await securityMonitorApi.summary();
  state.updatedAt = Date.now();
});
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

    &.risk {
      background: #e54b4b;
    }
  }

  .security-overview {
    display: grid;
    grid-template-columns: repeat(3, 1fr) 1.25fr;
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
    flex-direction: column;
    justify-content: center;
    color: #16885d;

    &.danger {
      color: #d94343;
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
