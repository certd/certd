<template>
  <fs-page class="page-project-member">
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip :title="t('certd.batchDelete')">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { onActivated, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { message, Modal } from "ant-design-vue";
import { DeleteBatch } from "./api";
import { useI18n } from "/src/locales";

const { t } = useI18n();

defineOptions({
  name: "ProjectMemberManager",
});
const { crudBinding, crudRef, crudExpose, context } = useFs({ createCrudOptions });

const selectedRowKeys = context.selectedRowKeys;
const handleBatchDelete = () => {
  if (selectedRowKeys.value?.length > 0) {
    Modal.confirm({
      title: t("certd.confirmTitle"),
      content: t("certd.confirmDeleteBatch", { count: selectedRowKeys.value.length }),
      async onOk() {
        await DeleteBatch(selectedRowKeys.value);
        message.info(t("certd.deleteSuccess"));
        crudExpose.doRefresh();
        selectedRowKeys.value = [];
      },
    });
  } else {
    message.error(t("certd.selectRecordsFirst"));
  }
};

// 页面打开后获取列表数据
onMounted(() => {
  crudExpose.doRefresh();
});
onActivated(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
