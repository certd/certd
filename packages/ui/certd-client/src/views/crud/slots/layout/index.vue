<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #header-top> <a-alert type="warning" message="header-top 插槽" /></template>
      <template #header-bottom><a-alert type="warning" message="header-bottom 插槽" /></template>
      <template #header-middle> <a-alert type="warning" message="header-middle 插槽" /></template>
      <template #footer-top> <a-alert type="warning" message="footer-top 插槽" /></template>
      <template #footer-bottom> <a-alert type="warning" message="footer-bottom 插槽" /></template>

      <template #pagination-left>
        <a-button type="danger">pagination-left插槽</a-button>
      </template>
      <template #pagination-right>
        <a-button type="danger">pagination-right插槽</a-button>
      </template>

      <template #search-left>
        <a-button type="danger">search-left插槽</a-button>
      </template>
      <template #search-middle>
        <a-button type="danger">search-middle</a-button>
      </template>
      <template #search-right>
        <a-button type="danger">search-right插槽</a-button>
      </template>

      <template #actionbar-left>
        <a-button type="danger">actionbar-left插槽</a-button>
      </template>
      <template #actionbar-right>
        <a-button type="danger">actionbar-right插槽</a-button>
      </template>

      <template #toolbar-left>
        <a-button type="danger">toolbar-left插槽</a-button>
      </template>
      <template #toolbar-right>
        <a-button type="danger">toolbar-right插槽</a-button>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useExpose } from "@fast-crud/fast-crud";
export default defineComponent({
  name: "SlotsLayout",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions } = createCrudOptions({ expose });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ expose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    onMounted(() => {
      expose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
