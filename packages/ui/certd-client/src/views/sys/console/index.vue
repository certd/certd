<template>
  <fs-page class="page-sys-console">
    <template #header>
      <div class="title">{{ t("certd.dashboard.consoleTitle") }}</div>
    </template>
    <div>
      <div class="statistic-data m-20">
        <a-row :gutter="20">
          <a-col :span="6">
            <statistic-card :title="t('certd.dashboard.userTotal')" :count="count.userCount">
              <template #footer>
                <router-link to="/sys/authority/user" class="flex">
                  <fs-icon icon="ion:settings-outline" class="mr-5 fs-16" />
                  {{ t("certd.dashboard.manageUsers") }}
                </router-link>
              </template>
            </statistic-card>
          </a-col>
          <a-col :span="6">
            <statistic-card :title="t('certd.dashboard.userGrowth')">
              <day-count v-if="count.userRegisterCountPerDay" :data="count.userRegisterCountPerDay" :title="t('certd.dashboard.newUsers')"></day-count>
            </statistic-card>
          </a-col>
          <a-col :span="6">
            <statistic-card :title="t('certd.dashboard.allPipelineTotal')" :count="count.pipelineCount">
              <template #footer>
                <router-link to="/cert/pipeline" class="flex">
                  <fs-icon icon="ion:settings-outline" class="mr-5 fs-16" />
                  {{ t("certd.dashboard.managePipelines") }}
                </router-link>
              </template>
            </statistic-card>
          </a-col>
          <a-col :span="6">
            <statistic-card :title="t('certd.dashboard.pipelineGrowth')">
              <day-count v-if="count.pipelineCreateCountPerDay" :data="count.pipelineCreateCountPerDay" :title="t('certd.dashboard.newPipelines')"></day-count>
            </statistic-card>
          </a-col>
          <a-col :span="6">
            <statistic-card :title="t('certd.dashboard.recentRunTitle')" :footer="false">
              <day-count v-if="count.historyCountPerDay" :data="count.historyCountPerDay" :title="t('certd.dashboard.runCount')"></day-count>
            </statistic-card>
          </a-col>
        </a-row>
      </div>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { onMounted, ref, Ref } from "vue";
import { FsIcon } from "@fast-crud/fast-crud";
import StatisticCard from "/@/views/framework/home/dashboard/statistic-card.vue";
import DayCount from "/@/views/framework/home/dashboard/charts/day-count.vue";
import { GetStatisticCount } from "./api";
import { useI18n } from "/@/locales";

const count: Ref = ref({});
const { t } = useI18n();

function transformCountPerDayToChartData(key: string) {
  count.value[key] = count.value[key].map((item: any) => {
    return {
      name: item.date,
      value: item.count,
    };
  });
}

async function loadCount() {
  count.value = await GetStatisticCount();
  transformCountPerDayToChartData("userRegisterCountPerDay");
  transformCountPerDayToChartData("pipelineCreateCountPerDay");
  transformCountPerDayToChartData("historyCountPerDay");
}

onMounted(async () => {
  await loadCount();
});
</script>
<style lang="less">
.page-sys-console {
  .fs-page-content {
    background-color: #eee;
  }
}
</style>
