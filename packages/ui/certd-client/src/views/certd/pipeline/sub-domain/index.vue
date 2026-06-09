<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">
        {{ t("certd.subdomainHosting") }}
        <span class="sub">
          {{ t("certd.subdomainHostingHint") }}；

          <span v-comm="false">
            {{ t("certd.subdomainHelpText") }}
            <a href="https://certd.docmirror.cn/guide/use/cert/subdomain.html" target="_blank">
              {{ t("certd.subdomainManagement") }}
            </a>
          </span>
        </span>
      </div>
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
import { onActivated, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { message, Modal } from "ant-design-vue";
import { DeleteBatch } from "./api";
import { useI18n } from "/src/locales";
import { useCrudPermission } from "/@/plugin/permission";

const { t } = useI18n();

defineOptions({
  name: "SubDomain",
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
      title: t("certd.confirm"),
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
onMounted(() => {
  // crudExpose.doRefresh();
});
onActivated(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
