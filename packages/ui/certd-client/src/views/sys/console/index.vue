<template>
  <fs-page class="page-sys-console">
    <template #header>
      <div class="title">控制台</div>
    </template>
    <div>
      <div class="statistic-data m-20">
        <a-row :gutter="20">
          <a-col :span="6">
            <statistic-card title="用户总数" :count="count.userCount">
              <template #footer>
                <router-link to="/sys/authority/user" class="flex">
                  <fs-icon icon="ion:settings-outline" class="mr-5 fs-16" />
                  管理用户
                </router-link>
              </template>
            </statistic-card>
          </a-col>
          <a-col :span="6">
            <statistic-card title="用户增长趋势">
              <day-count v-if="count.userRegisterCountPerDay" :data="count.userRegisterCountPerDay" title="新增用户"></day-count>
            </statistic-card>
          </a-col>
          <a-col :span="6">
            <statistic-card title="全站流水线总数" :count="count.pipelineCount">
              <template #footer>
                <router-link to="/cert/pipeline" class="flex">
                  <fs-icon icon="ion:settings-outline" class="mr-5 fs-16" />
                  管理流水线
                </router-link>
              </template>
            </statistic-card>
          </a-col>
          <a-col :span="6">
            <statistic-card title="流水线增长趋势">
              <day-count v-if="count.pipelineCreateCountPerDay" :data="count.pipelineCreateCountPerDay" title="新增流水线"></day-count>
            </statistic-card>
          </a-col>
          <a-col :span="6">
            <statistic-card title="最近运行统计" :footer="false">
              <day-count v-if="count.historyCountPerDay" :data="count.historyCountPerDay" title="运行次数"></day-count>
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

const count: Ref = ref({});

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
