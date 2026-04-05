<template>
  <fs-page>
    <template #header>
      <div class="title flex items-center">
        {{ t("monitor.history.title") }}
        <div class="sub flex-1">
          <div>
            {{ t("monitor.history.description") }}
          </div>
        </div>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip title="批量删除">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import { onActivated, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useI18n } from "/src/locales";
const { t } = useI18n();
defineOptions({
  name: "JobHistory",
});
const context: any = {
  permission: {
    isProjectPermission: true,
  },
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

const handleBatchDelete = context.handleBatchDelete;

// 页面打开后获取列表数据
onMounted(() => {
  crudExpose.doRefresh();
});
onActivated(() => {
  crudExpose.doRefresh();
});
</script>
