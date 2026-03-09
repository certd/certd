<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">
        {{ t("certd.sysResources.myProjectManager") }}
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <!-- <div v-if="crudBinding.data" class="project-list">
        <div v-for="item of crudBinding.data" :key="item.id" class="project-item">
          <a-card style="width: 300px">
            <p>{{ item.name }}</p>
          </a-card>
        </div>
      </div> -->
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
  name: "MyProjectManager",
});
const context: any = { permission: { isProjectPermission: true, projectPermission: "admin" } };
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

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
