<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip title="批量删除">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useExpose, useCrud, useFs } from "@fast-crud/fast-crud";
import { message, Modal } from "ant-design-vue";
import { BatchDelete } from "./api";
export default defineComponent({
  name: "FeatureTree",
  setup() {
    const { crudBinding, crudRef, crudExpose, selectedRowKeys } = useFs({ createCrudOptions });
    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    const handleBatchDelete = () => {
      if (selectedRowKeys.value?.length > 0) {
        Modal.confirm({
          title: "确认",
          content: `确定要批量删除这${selectedRowKeys.value.length}条记录吗`,
          async onOk() {
            await BatchDelete(selectedRowKeys.value);
            message.info("删除成功");
            crudExpose.doRefresh();
            selectedRowKeys.value = [];
          }
        });
      } else {
        message.error("请先勾选记录");
      }
    };

    return {
      crudBinding,
      crudRef,
      handleBatchDelete
    };
  }
});
</script>
