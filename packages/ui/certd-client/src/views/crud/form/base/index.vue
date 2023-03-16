<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="info" message="基本表单" />
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, nextTick } from "vue";
import { useFs, UseFsProps } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud.jsx";
export default defineComponent({
  name: "FormBase",
  setup() {
    const customValue: any = {}; //自定义变量，传给createCrudOptions的额外参数（可以任意命名，任意多个）
    const { crudBinding, crudRef, crudExpose, customExport } = useFs({ createCrudOptions, customValue } as UseFsProps);

    // 页面打开后获取列表数据
    onMounted(async () => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
