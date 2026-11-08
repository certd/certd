<template>
  <a-popover class="dashboard-security-summary" placement="bottomLeft" trigger="click" overlay-class-name="dashboard-security-popover">
    <template #content>
      <div class="security-status-popover">
        <div class="security-status-popover__title">{{ t("certd.dashboard.securityStatus") }}</div>
        <div class="security-status-popover__summary" :class="`is-${securityStatus.color}`">
          <fs-icon :icon="securityStatus.icon" />
          <div>
            <strong>{{ securityStatus.title }}</strong>
            <p>{{ securityStatus.description }}</p>
          </div>
        </div>
        <div v-if="settingsStore.isPlus && securitySummary" class="security-status-popover__issues">
          <div v-for="item in securityIssueItems" :key="item.name" class="security-status-issue">
            <span>
              <span class="security-status-issue__dot" :class="`is-${item.color}`"></span>
              {{ item.name }}
            </span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <router-link v-if="settingsStore.isPlus" to="/sys/security/monitor" class="security-status-popover__link">
          {{ t("certd.dashboard.viewSecurityDetails") }}
          <fs-icon icon="ion:chevron-forward-outline" />
        </router-link>
      </div>
    </template>
    <a-tag class="security-status-trigger" :class="`is-${securityStatus.color}`">
      <fs-icon :icon="securityStatus.icon" />
      {{ t("certd.dashboard.securityStatus") }} · {{ securityStatus.title }}
      <fs-icon icon="ion:chevron-down-outline" class="security-status-trigger__arrow" />
    </a-tag>
  </a-popover>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { notification } from "ant-design-vue";
import { useSettingStore } from "/@/store/settings";
import { useUserStore } from "/@/store/user";
import { SecurityMonitorSummary, securityMonitorApi } from "/@/views/sys/security/api";
import { useI18n } from "/src/locales";

defineOptions({ name: "DashboardSecuritySummary" });

const { t } = useI18n();
const settingsStore = useSettingStore();
const userStore = useUserStore();
const securitySummary = ref<SecurityMonitorSummary | null>(null);
const securitySummaryFailed = ref(false);
const securityStatus = computed(() => {
  if (!securitySummary.value) {
    if (securitySummaryFailed.value) {
      return {
        color: "danger",
        icon: "ion:alert-circle-outline",
        title: t("certd.dashboard.securityUnavailable"),
        description: t("certd.dashboard.securityUnavailableDescription"),
      };
    }
    return {
      color: "loading",
      icon: "ion:shield-outline",
      title: t("certd.dashboard.securityLoading"),
      description: t("certd.dashboard.securityLoadingDescription"),
    };
  }
  if (securitySummary.value.hasRecentRisk) {
    return {
      color: "danger",
      icon: "ion:warning-outline",
      title: t("certd.dashboard.securityRisk"),
      description: t("certd.dashboard.securityRiskDescription"),
    };
  }
  if (securitySummary.value.ipBanCount && securitySummary.value.ipBanCount > 0) {
    return {
      color: "warning",
      icon: "ion:shield-checkmark-outline",
      title: t("certd.dashboard.securityBlocked"),
      description: t("certd.dashboard.securityBlockedDescription"),
    };
  }
  return {
    color: "success",
    icon: "ion:shield-checkmark-outline",
    title: t("certd.dashboard.securityNormal"),
    description: t("certd.dashboard.securityNormalDescription"),
  };
});
const securityIssueItems = computed(() => {
  const summary = securitySummary.value;
  if (!summary) {
    return [];
  }
  return [
    { name: t("certd.dashboard.securityRiskCount"), value: summary.riskCount, color: summary.riskCount > 0 ? "danger" : "success" },
    { name: t("certd.dashboard.securitySuspiciousPipelineCount"), value: summary.suspiciousPipelineCount, color: summary.suspiciousPipelineCount > 0 ? "warning" : "success" },
    { name: t("certd.dashboard.securityBlockedIpCount"), value: summary.ipBanCount, color: summary.ipBanCount > 0 ? "info" : "success" },
  ];
});

async function loadSecuritySummary() {
  if (!userStore.isAdmin) {
    return;
  }
  try {
    securitySummary.value = await securityMonitorApi.summary();
    securitySummaryFailed.value = false;
  } catch (error: any) {
    securitySummaryFailed.value = true;
    notification.error({ message: t("certd.dashboard.securityLoadError"), description: error.message });
  }
}

onMounted(loadSecuritySummary);
</script>

<style lang="less">
.dashboard-security-summary {
  .security-status-trigger {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 12px;
    cursor: pointer;
    line-height: 22px;

    &.is-success {
      color: #389e0d;
      border-color: #b7eb8f;
      background: #f6ffed;
    }

    &.is-warning {
      color: #d48806;
      border-color: #ffe58f;
      background: #fffbe6;
    }

    &.is-danger {
      color: #cf1322;
      border-color: #ffa39e;
      background: #fff1f0;
    }

    &.is-loading {
      color: #1677ff;
      border-color: #91caff;
      background: #e6f4ff;
    }

    .security-status-trigger__arrow {
      font-size: 12px;
    }
  }
}

.dashboard-security-popover {
  .security-status-popover {
    width: 280px;
  }

  .security-status-popover__title {
    margin-bottom: 12px;
    font-weight: 600;
  }

  .security-status-popover__summary {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border-radius: 6px;

    > .fs-icon {
      margin-top: 2px;
      font-size: 20px;
    }

    strong {
      font-size: 15px;
    }

    p {
      margin: 3px 0 0;
      color: #8c8c8c;
      font-size: 12px;
    }

    &.is-success {
      color: #389e0d;
      background: #f6ffed;
    }

    &.is-warning {
      color: #d48806;
      background: #fffbe6;
    }

    &.is-danger {
      color: #cf1322;
      background: #fff1f0;
    }

    &.is-loading {
      color: #1677ff;
      background: #e6f4ff;
    }
  }

  .security-status-popover__issues {
    margin-top: 10px;
  }

  .security-status-issue {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;

    > span {
      display: flex;
      align-items: center;
    }
  }

  .security-status-issue__dot {
    width: 8px;
    height: 8px;
    flex: none;
    margin-right: 8px;
    border-radius: 50%;

    &.is-success {
      background: #52c41a;
    }

    &.is-warning {
      background: #faad14;
    }

    &.is-danger {
      background: #ff4d4f;
    }

    &.is-info {
      background: #1677ff;
    }
  }

  .security-status-popover__link {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 5px;
    margin-top: 12px;
  }
}

.dark .dashboard-security-popover {
  .security-status-popover__summary {
    p {
      color: rgba(255, 255, 255, 0.55);
    }

    &.is-success {
      color: #95de64;
      background: #162312;
    }

    &.is-warning {
      color: #ffc53d;
      background: #2b2111;
    }

    &.is-danger {
      color: #ff7875;
      background: #2a1215;
    }

    &.is-loading {
      color: #69b1ff;
      background: #111d2c;
    }
  }

  .security-status-issue {
    border-color: #303030;
  }
}
</style>
