<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">
        {{ t("certd.certdomain.domain.domainManager") }}
        <span class="sub">
          {{ t("certd.certdomain.domain.domainDescription") }}
        </span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip v-if="hasActionPermission('write')" :title="t('certd.common.batch_delete')">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { notification, Modal } from "ant-design-vue";
import { DeleteBatch } from "./api";
import { useI18n } from "/src/locales";
import { useCrudPermission } from "/@/plugin/permission";
import { useMounted } from "/@/use/use-mounted";

const { t } = useI18n();

defineOptions({
  name: "DomainManager",
});
const context: any = {
  permission: {
    isProjectPermission: true,
  },
};

const { hasActionPermission } = useCrudPermission({ permission: context.permission });
context.hasActionPermission = hasActionPermission;
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

const selectedRowKeys = context.selectedRowKeys;
const handleBatchDelete = () => {
  if (selectedRowKeys.value?.length > 0) {
    Modal.confirm({
      title: t("certd.common.confirm"),
      content: t("certd.common.confirm_delete_count", { count: selectedRowKeys.value.length }),
      async onOk() {
        await DeleteBatch(selectedRowKeys.value);
        notification.info({ message: t("certd.common.delete_successful") });
        crudExpose.doRefresh();
        selectedRowKeys.value = [];
      },
    });
  } else {
    notification.error({ message: t("certd.common.please_select_records") });
  }
};

// 页面打开后获取列表数据
useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
