<template>
  <div v-if="data.length !== 0" class="expiring-pipeline-list">
    <div v-for="item of data" :key="item.id" class="pipeline-row">
      <div class="title" :title="item.title">
        <pi-status-show :status="item.status"></pi-status-show> <a @click="goDetail(item)">{{ item.title }}</a>
      </div>
      <div class="time">
        <FsTimeHumanize v-model="item.lastVars.certExpiresTime" :use-format-greater="1000000000000" :options="{ units: ['d'] }"></FsTimeHumanize>
      </div>
    </div>
  </div>
  <div v-else class="flex-center flex-1 flex-col">
    <a-empty> </a-empty>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import PiStatusShow from "/@/views/certd/pipeline/pipeline/component/status-show.vue";
const props = defineProps<{
  data: any[];
}>();
const router = useRouter();
function goDetail(item) {
  router.push({ path: "/certd/pipeline/detail", query: { id: item.id } });
}
</script>
<style lang="less">
.expiring-pipeline-list {
  padding-top: 5px;
  .pipeline-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    .title {
      display: flex;
      align-items: center;
      flex: 1;
      overflow: hidden;
      //多余隐藏
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .time {
      margin-left: 10px;
      width: 70px;
      text-align: left;
    }
  }
}
</style>
