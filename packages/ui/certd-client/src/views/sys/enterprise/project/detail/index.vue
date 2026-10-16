<template>
  <fs-page class="page-project-detail">
    <template #header>
      <div class="title">
        {{ t("certd.project.ent.projectDetailManager") }}
        <span class="sub">
          {{ t("certd.project.ent.projectDetailDescription") }}
        </span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip :title="t('certd.common.batchDelete')">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { Modal, notification } from "ant-design-vue";
import { DeleteBatch } from "./api";
import { useI18n } from "/src/locales";
import { useCrudPermission } from "/@/plugin/permission";
import { useRoute } from "vue-router";

const { t } = useI18n();

defineOptions({
  name: "ProjectDetail",
});

const route = useRoute();
const projectIdStr = route.query.projectId as string;
const projectId = Number(projectIdStr);

const context: any = {
  projectId,
};
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

const selectedRowKeys = context.selectedRowKeys;
const handleBatchDelete = () => {
  if (selectedRowKeys.value?.length > 0) {
    Modal.confirm({
      title: t("certd.common.confirmTitle"),
      content: t("certd.common.confirmDeleteBatch", { count: selectedRowKeys.value.length }),
      async onOk() {
        await DeleteBatch(selectedRowKeys.value);
        notification.info({ message: t("certd.common.deleteSuccess") });
        crudExpose.doRefresh();
        selectedRowKeys.value = [];
      },
    });
  } else {
    notification.error({ message: t("certd.common.selectRecordsFirst") });
  }
};

// 页面打开后获取列表数据
useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
