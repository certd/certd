<template>
  <div class="domain-import-task-status min-h-[300px]">
    <div class="action mb-5">
      <fs-button type="primary" icon="ion:add-outline" @click="addTask">添加导入任务</fs-button>
      <fs-button type="primary" icon="ion:refresh-outline" class="ml-2" @click="loadImportTaskStatus">刷新</fs-button>
    </div>
    <div class="table-container overflow-auto mb-10">
      <table class="cd-table border-gray-300 w-full">
        <thead>
          <tr>
            <th class="w-[220px]">来源</th>
            <th class="">进度</th>
            <th class="w-[220px]">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.key">
            <td class="ellipsis">
              <span class="flex items-center pointer" @click="editTask(item)">
                <span class="flex-1 ellipsis flex items-center">
                  <fs-icon :icon="item.icon" class="mr-2"></fs-icon>
                  {{ item.title }}
                </span>
                <fs-icon icon="ant-design:edit-outlined" class="ml-2" />
              </span>
            </td>
            <td>
              <div v-if="item.task">
                <div>
                  <a-tag color="blue">总数：{{ item.task?.total }}</a-tag>
                  <a-tag color="success" class="ml-2">成功：{{ item.task?.successCount }}</a-tag>
                  <a-tag type="info" class="ml-2">跳过：{{ item.task?.skipCount }}</a-tag>
                  <a-tooltip v-if="item.task?.errors.length > 0">
                    <template #title>
                      <div v-for="error in item.task?.errors" :key="error">{{ error }}</div>
                    </template>
                    <a-tag color="red" class="ml-2">失败：{{ item.task?.errors.length }}</a-tag>
                  </a-tooltip>
                </div>
                <a-progress :percent="item.task?.progress" size="small" status="active" />
              </div>
              <div v-else>未执行</div>
            </td>
            <td>
              <fs-button type="primary" icon="ion:play-outline" :disabled="item.task?.status === 'running'" @click="startTask(item)">执行</fs-button>
              <fs-button type="primary" class="ml-2" danger icon="ion:trash-outline" @click="deleteTask(item)">删除</fs-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import * as api from "./api";
import { Modal } from "ant-design-vue";
import { useDomainImport } from "./use";
import { Dicts } from "/@/components/plugins/lib/dicts";
defineOptions({
  name: "DomainImportTaskStatus",
});

const list = ref([]);

async function loadImportTaskStatus() {
  const res = await api.ImportTaskStatus();
  list.value = res || [];
}

async function startTask(item: any) {
  await api.ImportTaskStart(item.key);
  await loadImportTaskStatus();
}

async function deleteTask(item: any) {
  Modal.confirm({
    title: "确认删除吗？",
    okText: "确认",
    okType: "danger",
    onOk: async () => {
      await api.ImportTaskDelete(item.key);
      await loadImportTaskStatus();
    },
  });
}

const openDomainImportDialog = useDomainImport();

async function addTask() {
  await openDomainImportDialog({
    afterSubmit: async (res?: any) => {
      if (res) {
        await api.ImportTaskStart(res.key);
      }
      await loadImportTaskStatus();
    },
  });
}

async function editTask(item: any) {
  await openDomainImportDialog({
    afterSubmit: async () => {
      await loadImportTaskStatus();
    },
    form: item,
  });
}

const checkIntervalRef = ref();
onMounted(async () => {
  await loadImportTaskStatus();
  checkIntervalRef.value = setInterval(async () => {
    await loadImportTaskStatus();
  }, 3000);
});

onUnmounted(() => {
  clearInterval(checkIntervalRef.value);
});
</script>

<style lang="less">
.domain-import-task-status {
  .table-container {
    height: 50vh;
  }

  .ant-progress {
    margin-bottom: 0px;
  }
}
</style>
