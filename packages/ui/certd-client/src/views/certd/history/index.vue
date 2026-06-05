<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">{{ t("certd.pipelineExecutionRecords") }}</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip v-if="hasActionPermission('write')" :title="t('certd.batchDelete')">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useMounted } from "/@/use/use-mounted";
import { onActivated, onMounted } from "vue";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";
import { message, Modal } from "ant-design-vue";
import { useMounted } from "/@/use/use-mounted";
import { DeleteBatch } from "./api";
import { useMounted } from "/@/use/use-mounted";
import { useI18n } from "/src/locales";
import { useMounted } from "/@/use/use-mounted";
import { useCrudPermission } from "/@/plugin/permission";

const { t } = useI18n();

defineOptions({
  name: "PipelineHistory",
});

const context: any = {
  permission: { isProjectPermission: true },
};

const { hasActionPermission } = useCrudPermission(context);
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

const selectedRowKeys = context.selectedRowKeys;
const handleBatchDelete = () => {
  if (selectedRowKeys.value?.length > 0) {
    Modal.confirm({
      title: t("certd.confirm"),
      content: t("certd.confirmBatchDeleteContent", { count: selectedRowKeys.value.length }),
      async onOk() {
        await DeleteBatch(selectedRowKeys.value);
        message.info(t("certd.deleteSuccess"));
        crudExpose.doRefresh();
        selectedRowKeys.value = [];
      },
    });
  } else {
    message.error(t("certd.pleaseSelectRecords"));
  }
};
useMounted(() => crudExpose.doRefresh());
</script>
<style lang="less"></style>
