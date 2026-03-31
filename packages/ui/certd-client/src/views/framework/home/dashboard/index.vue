<template>
  <div class="dashboard-user">
    <div class="header-profile flex-wrap bg-white dark:bg-black">
      <div class="flex flex-1">
        <div class="avatar">
          <a-avatar v-if="userInfo.avatar" size="large" :src="avatar" style="background-color: #eee"> </a-avatar>
          <a-avatar v-else size="large" style="background-color: #00b4f5">
            {{ userInfo.username }}
          </a-avatar>
        </div>
        <div class="text">
          <div class="left">
            <div>
              <span>{{ t("certd.dashboard.greeting", { name: userInfo.nickName || userInfo.username, site: siteInfo.title }) }}</span>
            </div>
            <div class="flex-o flex-wrap profile-badges">
              <a-tooltip :title="deltaTimeTip">
                <a-badge :dot="deltaTimeWarning">
                  <a-tag :color="deltaTimeWarning ? 'red' : 'green'" class="flex-inline pointer"> <fs-icon icon="ion:time-outline"></fs-icon> {{ now }} </a-tag>
                </a-badge>
              </a-tooltip>

              <template v-if="userStore.isAdmin">
                <a-divider type="vertical" />
                <a-badge :dot="hasNewVersion">
                  <a-tag color="blue" class="flex-inline pointer mr-0" :title="t('certd.dashboard.latestVersion', { version: latestVersion })" @click="openUpgradeUrl()">
                    <fs-icon icon="ion:rocket-outline" class="mr-5"></fs-icon>
                    v{{ version }}
                  </a-tag>
                </a-badge>
                <a-divider type="vertical" />
                <a-tag color="blue" class="flex-inline pointer mr-0" @click="openChangeLogUrl()">
                  {{ t("certd.dashboard.changeLog") }}
                </a-tag>
                <a-divider type="vertical" />
                <vip-button mode="nav" style="font-size: 12px"></vip-button>
              </template>

              <template v-if="settingsStore.isEnterprise">
                <a-divider type="vertical" />
                <project-current></project-current>
              </template>
              <template v-if="settingsStore.isComm">
                <a-divider type="vertical" />
                <suite-card class="m-0"></suite-card>
              </template>
              <template v-if="settingsStore.isPlus && settingsStore.sysPublic.userValidTimeEnabled === true && userInfo.validTime">
                <a-divider type="vertical" />
                <valid-time-format class="flex-o" :prefix="t('certd.dashboard.validUntil')" :model-value="userInfo.validTime" />
              </template>
            </div>
          </div>
        </div>
      </div>

      <div class="suggest hidden md:block">
        <tutorial-button class="flex-center mt-2">
          <a-tooltip :title="t('certd.dashboard.tutorialTooltip')">
            <a-tag color="blue" class="flex-center">
              {{ t("certd.dashboard.tutorialText") }}
              <fs-icon class="font-size-16 ml-5" icon="mingcute:question-line"></fs-icon>
            </a-tag>
          </a-tooltip>
        </tutorial-button>
        <SimpleSteps></SimpleSteps>
      </div>
    </div>
    <div class="warning">
      <notice-bar :list="noticeList"></notice-bar>
    </div>

    <div class="statistic-data m-20">
      <a-row :gutter="20" class="flex-wrap">
        <a-col :md="6" :xs="24">
          <statistic-card icon="fluent-color:data-line-24" :title="t('certd.dashboard.pipelineCount')" :count="count.pipelineCount" link="/certd/pipeline" :sub-counts="count.pipelineEnableCount">
            <template v-if="count.pipelineCount === 0" #default>
              <div class="flex-center flex-1 flex-col">
                <div style="font-size: 18px; font-weight: 700">{{ t("certd.dashboard.noPipeline") }}</div>
                <fs-button type="primary" class="mt-10" icon="ion:add-circle-outline" @click="goPipeline">{{ t("certd.dashboard.createNow") }}</fs-button>
              </div>
            </template>
            <template #footer>
              <router-link to="/certd/pipeline" class="flex"> <fs-icon icon="ion:settings-outline" class="mr-5 fs-16" /> {{ t("certd.dashboard.managePipeline") }} </router-link>
            </template>
          </statistic-card>
        </a-col>
        <!-- <a-col :md="6" :xs="24">
          <statistic-card :title="t('certd.dashboard.pipelineStatus')" :footer="false">
            <pie-count v-if="count.pipelineStatusCount" :data="count.pipelineStatusCount"></pie-count>
          </statistic-card>
        </a-col> -->
        <a-col :md="6" :xs="24">
          <statistic-card icon="fluent-color:certificate-24" :title="t('certd.dashboard.certCount')" :count="count.certCount" link="/certd/monitor/cert" :sub-counts="count.certStatusCount">
            <template v-if="count.certCount === 0" #default>
              <div class="flex-center flex-1 flex-col">
                <div style="font-size: 18px; font-weight: 700">{{ t("certd.dashboard.noCert") }}</div>
              </div>
            </template>
            <template #footer>
              <router-link to="/certd/monitor/cert" class="flex"> <fs-icon icon="ion:settings-outline" class="mr-5 fs-16" /> {{ t("certd.dashboard.manageCert") }} </router-link>
            </template>
          </statistic-card>
        </a-col>
        <a-col :md="6" :xs="24">
          <statistic-card icon="fluent-color:data-trending-24" :title="t('certd.dashboard.recentRun')" :footer="false">
            <day-count v-if="count.historyCountPerDay" :data="count.historyCountPerDay" :title="t('certd.dashboard.runCount')"></day-count>
          </statistic-card>
        </a-col>
        <a-col :md="6" :xs="24">
          <statistic-card icon="fluent-color:alert-urgent-24" :title="t('certd.dashboard.expiringCerts')">
            <expiring-list v-if="count.expiringList" :data="count.expiringList"></expiring-list>
          </statistic-card>
        </a-col>
      </a-row>
    </div>

    <div v-if="pluginGroups" class="plugin-list">
      <a-card>
        <template #title>
          <div class="flex items-center">
            <fs-icon icon="fluent-color:puzzle-piece-24" class="mr-5 fs-28" />
            <div class="mr-5">{{ t("certd.dashboard.supportedTasks") }}</div>
            <a-tag color="green">{{ pluginGroups.groups.all.plugins.length }}</a-tag>
          </div>
        </template>
        <a-row :gutter="10">
          <a-col v-for="item of pluginGroups.groups.all.plugins" :key="item.name" class="plugin-item-col" :xl="4" :md="6" :xs="24">
            <a-card>
              <a-tooltip class="flex-between overflow-hidden">
                <template #title>
                  <div>{{ item.title }}</div>
                  <div>{{ item.desc }}</div>
                </template>
                <div class="plugin-item pointer">
                  <div class="icon">
                    <fs-icon :icon="item.icon" class="font-size-16 color-blue" />
                  </div>
                  <div class="text flex-1 ellipsis">
                    <div class="title">{{ item.title }}</div>
                  </div>
                </div>
                <div class="flex-o ml-1"><vip-button v-if="item.needPlus" mode="icon" class="" /></div>
              </a-tooltip>
            </a-card>
          </a-col>
        </a-row>
      </a-card>
    </div>
    <a-tour v-bind="tour" v-model:current="tour.current" />
  </div>
</template>

<script lang="ts" setup>
import { FsIcon } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import dayjs from "dayjs";
import { computed, ComputedRef, onMounted, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import * as api from "./api";
import DayCount from "./charts/day-count.vue";
import ExpiringList from "./charts/expiring-list.vue";
import NoticeBar from "./notice-bar.vue";
import SuiteCard from "./suite-card.vue";
import TutorialButton from "/@/components/tutorial/index.vue";
import SimpleSteps from "/@/components/tutorial/simple-steps.vue";
import { usePluginStore } from "/@/store/plugin";
import { useSettingStore } from "/@/store/settings";
import { SiteInfo } from "/@/store/settings/api.basic";
import { useUserStore } from "/@/store/user";
import { UserInfoRes } from "/@/store/user/api.user";
import { LocalStorage } from "/@/utils/util.storage";
import { GetStatisticCount } from "/@/views/framework/home/dashboard/api";
import StatisticCard from "/@/views/framework/home/dashboard/statistic-card.vue";
import { useI18n } from "/src/locales";
const { t } = useI18n();
defineOptions({
  name: "DashboardUser",
});

const version = ref(import.meta.env.VITE_APP_VERSION);
const latestVersion = ref("");

function isNewVersion(version: string, latestVersion: string) {
  if (!latestVersion) {
    return false;
  }
  if (latestVersion === version) {
    return false;
  }
  //分段比较
  const current = version.split(".");
  const latest = latestVersion.split(".");
  for (let i = 0; i < current.length; i++) {
    if (parseInt(latest[i]) > parseInt(current[i])) {
      return true;
    } else if (parseInt(latest[i]) < parseInt(current[i])) {
      return false;
    }
  }
  return false;
}

const hasNewVersion = computed(() => {
  return isNewVersion(version.value, latestVersion.value);
});
async function loadLatestVersion() {
  latestVersion.value = await api.GetLatestVersion();
  console.log("latestVersion", latestVersion.value);

  const minVersion = settingsStore.productInfo?.app?.minVersion;
  if (minVersion) {
    if (isNewVersion(version.value, minVersion)) {
      notification.error({
        message: settingsStore.productInfo?.app?.minVersionTip ?? "版本过低，为了您的数据安全，请尽快升级",
      });
    }
  }
}
const settingStore = useSettingStore();
const siteInfo: Ref<SiteInfo> = computed(() => {
  return settingStore.siteInfo;
});
const settingsStore = useSettingStore();
const defaultExpireDays = computed(() => {
  return settingsStore.sysPublic.defaultCertRenewDays || settingsStore.sysPublic.defaultWillExpireDays || 15;
});
const userStore = useUserStore();
const userInfo: ComputedRef<UserInfoRes> = computed(() => {
  return userStore.getUserInfo;
});
const avatar = computed(() => {
  const avt = userStore.getUserInfo?.avatar;
  if (!avt) {
    return "";
  }
  if (avt.startsWith("http")) {
    return avt;
  }
  return `/api/basic/file/download?key=${avt}`;
});
const now = computed(() => {
  const serverTime = Date.now() - settingStore.app.deltaTime;
  return dayjs(serverTime).format("YYYY-MM-DD HH:mm:ss");
});

const deltaTimeWarning = computed(() => {
  return Math.abs(settingStore.app.deltaTime) > 1000 * 60 * 4;
});
const deltaTimeTip = computed(() => {
  const deltaMin = (Math.abs(settingStore.app.deltaTime) / 1000 / 60).toFixed(2);
  return `服务器时间相差:${deltaMin}分钟${deltaTimeWarning.value ? "，请检查服务器时间是否正确" : ""}`;
});
const router = useRouter();
function goPipeline() {
  router.push({ path: "/certd/pipeline" });
}

const count: any = ref({});
function transformStatusCount() {
  const data = count.value.pipelineStatusCount;
  const sorted = [
    { name: "success", label: "成功" },
    { name: "start", label: "运行中" },
    { name: "error", label: "失败" },
    { name: "canceled", label: "已取消" },
    { name: null, label: "未执行" },
    { name: "skip", label: "跳过" },
  ];
  const result = [];
  for (const item of sorted) {
    const find = data.find((v: any) => v.status === item.name);
    if (find) {
      result.push({ name: item.label, value: find.count });
    } else {
      result.push({ name: item.label, value: 0 });
    }
  }
  count.value.pipelineStatusCount = result;

  const pipelineEnableCount = count.value.pipelineEnableCount;
  count.value.pipelineEnableCount = [
    { name: t("certd.dashboard.enabledCount"), value: pipelineEnableCount.enabled, color: "green" },
    { name: t("certd.dashboard.disabledCount"), value: pipelineEnableCount.disabled, color: "gray" },
  ];
  const certCount = count.value.certCount;
  count.value.certStatusCount = [
    { name: t("certd.dashboard.certExpiredCount"), value: certCount.expired, color: "red", checkIcon: "mingcute:warning-fill:#f44336", link: { path: "/certd/monitor/cert", query: { expireStatus: "expired" } } },
    {
      name: t("certd.dashboard.certExpiringCount"),
      value: certCount.expiring,
      color: "yellow",
      checkIcon: "mingcute:alert-fill:#ff9800",
      title: `到期不足${defaultExpireDays.value}天`,
      link: { path: "/certd/monitor/cert", query: { expireStatus: "expiring" } },
    },
    { name: t("certd.dashboard.certNoExpireCount"), value: certCount.notExpired, color: "green", link: { path: "/certd/monitor/cert", query: { expireStatus: "noExpired" } } },
  ];
  count.value.certCount = certCount.total;
}
async function loadCount() {
  count.value = await GetStatisticCount();
  transformStatusCount();
  count.value.historyCountPerDay = count.value.historyCountPerDay.map((item: any) => {
    return {
      name: item.date,
      value: item.count,
    };
  });
}

const pluginStore = usePluginStore();
async function loadPluginGroups() {
  const groups = await pluginStore.getGroups();
  pluginGroups.value = groups;
}

const pluginGroups = ref();
onMounted(async () => {
  await userStore.loadUserInfo();
  loadLatestVersion();
  loadCount();
  loadPluginGroups();
  if (count.value.pipelineCount === 0) {
    tourHandleOpen(true);
  }
});

function openUpgradeUrl() {
  window.open("https://certd.docmirror.cn/guide/install/upgrade.html");
}
function openChangeLogUrl() {
  window.open("https://certd.docmirror.cn/guide/changelogs/CHANGELOG.html");
}

const noticeList = computed(() => {
  const list = [];
  if (!settingStore.isComm) {
    list.push(`
          ${t("certd.dashboard.alertMessage")}
          <a class="ml-5 flex-inline" href="https://gitee.com/certd/certd" target="_blank">
            gitee
          </a>
          、
          <a class="ml-5 flex-inline" href="https://github.com/certd/certd" target="_blank">
            github
          </a>
          、
          <a class="ml-5 flex-inline" href="https://certd.docmirror.cn" target="_blank">
            ${t("certd.dashboard.helpDoc")}
          </a>
        `);
  }

  if (settingStore.sysPublic.notice) {
    list.push(`${settingStore.sysPublic.notice}`);
  }

  return list;
});

function useTour() {
  const tour = ref({
    open: false,
    current: 0,
    steps: [],
    onClose: () => {
      tour.value.open = false;
      LocalStorage.set("home-tour-off", true, 999999999);
    },
    onFinish: () => {
      tour.value.open = false;
      LocalStorage.set("home-tour-off", true, 999999999);
    },
  });

  const tourHandleOpen = (val: boolean): void => {
    if (LocalStorage.get("home-tour-off")) {
      return;
    }
    initSteps();
    tour.value.open = val;
  };

  function initSteps() {
    //@ts-ignore
    tour.value.steps = [
      {
        title: "您是第一次使用吗？",
        description: "此处可以查看新手教程哦 ↑↑↑↑",
        target: () => {
          return document.querySelector("header .tutorial-button");
        },
      },
    ];
  }

  return {
    tour,
    tourHandleOpen,
  };
}

const { tour, tourHandleOpen } = useTour();
</script>

<style lang="less">
.dashboard-user {
  .ant-card-head {
    padding: 0px 18px;
  }
  .ant-card-body {
    padding: 15px 18px;
  }
  .warning {
    .ant-alert {
      border-left: 0;
      border-right: 0;
      border-radius: 0;
      display: flex !important;
    }
    height: 40px;
    overflow: hidden;
  }
  .header-profile {
    display: flex;
    align-items: center;
    padding: 20px;

    .profile-badges {
      > * {
        margin: 4px;
      }
    }

    .avatar {
      margin-right: 10px;
    }
    .text {
      flex: 1;
      display: flex;
      flex-direction: row;
      .left {
        display: flex;
        flex-direction: column;
        justify-content: center;
        > div {
          margin: 4px;
        }
      }
    }
  }
  .notice {
    padding: 20px;
  }
  .plugin-list {
    margin: 0 20px;

    .ant-card .ant-card-body {
      padding: 16px;
    }
    .plugin-item-col {
      margin-bottom: 10px;
      .plugin-item {
        display: flex;
        justify-items: center;
        line-height: 20px;
        overflow: hidden;
        flex: 1;
        .icon {
          display: flex;
          justify-items: center;
          font-size: 20px;
          margin-right: 8px;
        }
        .text {
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: keep-all;
          white-space: nowrap;
        }
      }
    }
  }
}
</style>
