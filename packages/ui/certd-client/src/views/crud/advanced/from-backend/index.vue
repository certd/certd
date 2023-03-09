<template>
  <fs-crud v-if="crudBinding" ref="crudRef" v-bind="crudBinding" />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, Ref } from "vue";
import { useCrud, dict, useExpose, useFs, UseFsProps, CrudBinding, CreateCrudOptionsRet, useFsAsync } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
export default defineComponent({
  name: "AdvancedFromBackend",
  setup() {
    // crud组件的ref
    const crudRef: Ref = ref();
    // crud 配置的ref
    const crudBinding: Ref<CrudBinding> = ref();

    const customValue: any = {}; //自定义变量，传给createCrudOptions的额外参数

    // 初始化crud配置
    // 页面打开后获取列表数据
    onMounted(async () => {
      const customValue = {};
      const { crudExpose, extraExport } = await useFsAsync({ crudRef, crudBinding, createCrudOptions, customValue });
      // 刷新数据
      await crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
