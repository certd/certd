<template>
  <div class="domain-import-task-status min-h-[300px]">
    <div class="action mb-5">
      <fs-button type="primary" icon="mingcute:vip-1-line" @click="addTask">{{ t("certd.certdomain.domain.addImportTask") }}</fs-button>
      <fs-button type="primary" icon="ion:refresh-outline" class="ml-2" @click="loadImportTaskStatus">{{ t("certd.certdomain.domain.refresh") }}</fs-button>
    </div>
    <div class="table-container overflow-auto mb-10">
      <table class="cd-table border-gray-300 w-full">
        <thead>
          <tr>
            <th class="w-[220px]">{{ t("certd.common.sourcee") }}</th>
            <th class="">{{ t("certd.certdomain.domain.progress") }}</th>
            <th class="w-[220px]">{{ t("certd.certdomain.domain.operation") }}</th>
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
                  <a-tag color="blue">{{ t("certd.certdomain.domain.total") }}：{{ item.task?.total }}</a-tag>
                  <a-tag color="success" class="ml-2">{{ t("certd.common.success") }}：{{ item.task?.successCount }}</a-tag>
                  <a-tag type="info" class="ml-2">{{ t("certd.certdomain.domain.skipped") }}：{{ item.task?.skipCount }}</a-tag>
                  <a-tooltip v-if="item.task?.errors.length > 0">
                    <template #title>
                      <div v-for="error in item.task?.errors" :key="error">{{ error }}</div>
                    </template>
                    <a-tag color="red" class="ml-2">{{ t("certd.certdomain.domain.failed") }}：{{ item.task?.errors.length }}</a-tag>
                  </a-tooltip>
                </div>
                <a-progress :percent="item.task?.progress" size="small" status="active" />
              </div>
              <div v-else>{{ t("certd.certdomain.domain.notExecuted") }}</div>
            </td>
            <td>
              <fs-button type="primary" icon="ion:play-outline" :disabled="item.task?.status === 'running'" @click="startTask(item)">{{ t("certd.certdomain.domain.execute") }}</fs-button>
              <fs-button type="primary" class="ml-2" danger icon="ion:trash-outline" @click="deleteTask(item)">{{ t("certd.certdomain.domain.delete") }}</fs-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Modal } from "ant-design-vue";
import { onMounted, onUnmounted, ref } from "vue";
import * as api from "./api";
import { useDomainImport } from "./use";
import { useSettingStore } from "/@/store/settings";
import { useI18n } from "/@/locales";
defineOptions({
  name: "DomainImportTaskStatus",
});

const list = ref([]);
const { t } = useI18n();

async function loadImportTaskStatus() {
  const res = await api.ImportTaskStatus();
  list.value = res || [];
}

async function startTask(item: any) {
  settingStore.checkPlus();
  await api.ImportTaskStart(item.key);
  await loadImportTaskStatus();
}

async function deleteTask(item: any) {
  Modal.confirm({
    title: t("certd.certdomain.domain.confirmDelete"),
    okText: t("common.confirm"),
    okType: "danger",
    onOk: async () => {
      await api.ImportTaskDelete(item.key);
      await loadImportTaskStatus();
    },
  });
}

const openDomainImportDialog = useDomainImport();
const settingStore = useSettingStore();
async function addTask() {
  settingStore.checkPlus();
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
  settingStore.checkPlus();
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
