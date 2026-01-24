<template>
  <div class="domain-import-task-status">
    <div class="action">
      <fs-button type="primary" size="small" icon="ion:add-outline" @click="addTask">添加导入任务</fs-button>
    </div>
    <table class="table table-striped">
      <thead>
        <tr>
          <th>标题</th>
          <th>进度</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in list" :key="item.taskId">
          <td>{{ item.title }}</td>
          <td>
            <a-progress :percent="item.percent" size="small" status="active" />
          </td>
          <td>
            <fs-button type="primary" size="small" icon="ion:play-outline" @click="startTask(item)">执行</fs-button>
            <fs-button type="danger" size="small" icon="ion:stop-outline" @click="deleteTask(item)">删除</fs-button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as api from "./api";
import { Modal } from "ant-design-vue";
import { useDomainImport } from "./use";
defineOptions({
  name: "DomainImportTaskStatus",
});

const list = ref([]);

async function loadImportTaskStatus() {
  const res = await api.ImportTaskStatus();
  list.value = res || [];
}

async function startTask(item: any) {
  await api.ImportTaskStart(item);
  await loadImportTaskStatus();
}

async function deleteTask(item: any) {
  Modal.confirm({
    title: "确认删除吗？",
    okText: "确认",
    okType: "danger",
    onOk: async () => {
      await api.ImportTaskDelete(item.taskId);
      await loadImportTaskStatus();
    },
  });
}

const openDomainImportDialog = useDomainImport();

async function addTask() {
  await openDomainImportDialog({
    afterSubmit: async () => {
      await loadImportTaskStatus();
    },
  });
}

onMounted(async () => {
  await loadImportTaskStatus();
});
</script>
