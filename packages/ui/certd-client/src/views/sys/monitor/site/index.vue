<template>
  <fs-page>
    <template #header>
      <div class="title">用户证书监控管理</div>
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
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import { useMounted } from "/@/use/use-mounted";
import { onActivated, onMounted } from "vue";
import createCrudOptions from "./crud";

defineOptions({
  name: "SysSiteMonitorManager",
});

const context: any = {};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });
const handleBatchDelete = context.handleBatchDelete;
useMounted(() => crudExpose.doRefresh());
</script>
