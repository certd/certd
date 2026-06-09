<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">
        {{ t("certd.cnameRecord") }}
        <span class="sub">
          <a v-comm="false" href="https://certd.docmirror.cn/guide/feature/cname/" target="_blank">
            {{ t("certd.cname_feature_guide") }}
          </a>
        </span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip v-if="hasActionPermission('write')" :title="t('certd.batch_delete')">
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
import { useCrudPermission } from "/@/plugin/permission";

const { t } = useI18n();

defineOptions({
  name: "CnameRecord",
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
      content: t("certd.confirm_delete_count", { count: selectedRowKeys.value.length }),
      async onOk() {
        await DeleteBatch(selectedRowKeys.value);
        message.info(t("certd.delete_successful"));
        crudExpose.doRefresh();
        selectedRowKeys.value = [];
      },
    });
  } else {
    message.error(t("certd.please_select_records"));
  }
};

// 页面打开后获取列表数据
onMounted(() => {
  // crudExpose.doRefresh();
});
onActivated(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
