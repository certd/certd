<template>
  <fs-page>
    <template #header>
      <div class="title flex items-center">{{ t("certd.navigation.sysResources.pipelineManager") }}</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip :title="$t('certd.common.batchDelete')">
          <fs-button icon="DeleteOutlined" class="need-plus" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useI18n } from "/src/locales";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

defineOptions({
  name: "SysPipelineManager",
});

const context: any = {};
const { t } = useI18n();
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });
const handleBatchDelete = context.handleBatchDelete;
useMounted(() => crudExpose.doRefresh());
</script>
