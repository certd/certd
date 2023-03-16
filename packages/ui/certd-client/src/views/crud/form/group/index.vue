<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #form_slotField="scope">
        <a-tooltip title="这是一个字段插槽示例"> <a-input v-model:value="scope.form.slotField" placeholder="我是插槽字段" /></a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useFs } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "FormGroup",
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
