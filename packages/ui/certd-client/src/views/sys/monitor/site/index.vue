<template>
  <fs-page>
    <template #header>
      <div class="title">User Certificate Monitor Management</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip title="Batch Delete">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import { useMounted } from "/@/use/use-mounted";
import createCrudOptions from "./crud";

defineOptions({
  name: "SysSiteMonitorManager",
});

const context: any = {};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });
const handleBatchDelete = context.handleBatchDelete;
useMounted(() => crudExpose.doRefresh());
</script>
