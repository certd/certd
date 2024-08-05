<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">流水线执行记录</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip title="批量删除">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { message, Modal } from "ant-design-vue";
import { DeleteBatch } from "/@/views/certd/history/api";

defineOptions({
  name: "PipelineHistory"
});
const { crudBinding, crudRef, crudExpose, context } = useFs({ createCrudOptions });

const selectedRowKeys = context.selectedRowKeys;
const handleBatchDelete = () => {
  if (selectedRowKeys.value?.length > 0) {
    Modal.confirm({
      title: "确认",
      content: `确定要批量删除这${selectedRowKeys.value.length}条记录吗`,
      async onOk() {
        await DeleteBatch(selectedRowKeys.value);
        message.info("删除成功");
        crudExpose.doRefresh();
        selectedRowKeys.value = [];
      }
    });
  } else {
    message.error("请先勾选记录");
  }
};

// 页面打开后获取列表数据
onMounted(() => {
  crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
