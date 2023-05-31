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
        <fs-button type="danger">search-left插槽</fs-button>
      </template>
      <template #search-middle>
        <fs-button type="danger">search-middle</fs-button>
      </template>
      <template #search-right>
        <fs-button type="danger">search-right插槽</fs-button>
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

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "SlotsLayout",
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
