<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="info" message=" ↑↑↑ 这里演示查询字段通过插槽自定义" />
      </template>
      <template #search_radio="scope">
        <a-input v-model:value="scope.form.radio" style="width: 200px" placeholder="字段插槽自定义" />
      </template>
      <template #search-middle="scope">
        <a-form-item label="自定义">
          <a-input v-model:value="scope.form.custom" placeholder="search-middle插槽" />
        </a-form-item>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "SlotsSearch",
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
