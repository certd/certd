<template>
  <fs-page>
    <fs-crud ref="crudRef" custom-class="page-layout" v-bind="crudBinding">
      <template #header-top>
        <div class="page-header">表单布局</div>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "FormLayout",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
<style lang="less">
// grid模式下， labelWidth 需要靠样式控制
.page-layout {
  .ant-form-item-label {
    width: 110px !important;
  }
}
</style>
