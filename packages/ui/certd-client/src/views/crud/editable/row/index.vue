<template>
  <fs-page>
    <template #header>
      <div class="title">
        行编辑模式
        <span class="sub">在表格内编辑每行数据</span>
      </div>
      <div class="more"><a target="_blank" href="http://fast-crud.docmirror.cn/api/expose.html">文档</a></div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <fs-button class="ml-5" @click="log">log</fs-button>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useFs } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "EditableRow",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
      crudExpose.editable.enable();
    });

    return {
      crudBinding,
      crudRef,
      log() {
        console.log("table data:", crudBinding.value.data, crudExpose.getTableData());
      }
    };
  }
});
</script>
