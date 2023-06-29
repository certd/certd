<template>
  <fs-page>
    <template #header>
      <div class="title">行编辑模式</div>
      <div class="more"><a target="_blank" href="http://fast-crud.docmirror.cn/api/expose.html">文档</a></div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useFs } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "FeatureEditableRow",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
      crudExpose.editable.enable({ mode: "row" });
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
