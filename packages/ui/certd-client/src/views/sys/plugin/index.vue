<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">
        {{ t("certd.pluginManagement") }}
        <span class="sub">{{ t("certd.pluginBetaWarning") }}</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <!--      <template #pagination-left>-->
      <!--        <a-tooltip :title="t('certd.batchDelete')">-->
      <!--          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>-->
      <!--        </a-tooltip>-->
      <!--      </template>-->
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { message, Modal } from "ant-design-vue";
import { DeleteBatch } from "./api";
import { useI18n } from "/src/locales";
import { useMounted } from "/@/use/use-mounted";

const { t } = useI18n();

defineOptions({
  name: "SysPlugin",
});
const { crudBinding, crudRef, crudExpose, context } = useFs({ createCrudOptions });

const selectedRowKeys = context.selectedRowKeys;
const handleBatchDelete = () => {
  if (selectedRowKeys.value?.length > 0) {
    Modal.confirm({
      title: t("certd.pluginManagement"),
      content: t("certd.batchDeleteConfirm", { count: selectedRowKeys.value.length }),
      async onOk() {
        await DeleteBatch(selectedRowKeys.value);
        message.info(t("certd.deleteSuccess"));
        crudExpose.doRefresh();
        selectedRowKeys.value = [];
      },
    });
  } else {
    message.error(t("certd.selectRecordFirst"));
  }
};

// 页面打开后获取列表数据
useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
