<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import createCrudOptions from "./crud.js";
import { useFs } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "ComponentTableSelect",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    const value = ref(null);
    return {
      crudBinding,
      crudRef,
      value
    };
  }
});
</script>
