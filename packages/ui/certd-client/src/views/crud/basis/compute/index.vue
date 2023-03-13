<template>
  <fs-page>
    <template #header>
      <div class="title">
        动态计算
        <fs-icon icon="ion:apps-sharp" :spin="true" />
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/advance/compute.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-tooltip title="我能控制表格显隐">
          <span class="ml-1">表格显隐:<a-switch v-model:checked="showTableRef"></a-switch></span>
        </a-tooltip>
        <span class="ml-1">列显隐:<a-switch v-model:checked="columnComponentShowRef"></a-switch></span>
        <a-alert class="ml-1" type="info" message="点击下方右边的编辑按钮查看示例效果-----------> ↓↓↓↓↓" />
      </template>
      <template #form_refSwitch>
        <a-switch v-model:checked="showRef"></a-switch>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "BasisCompute",
  setup() {
    const { crudBinding, crudRef, crudExpose, output } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef,
      ...output
    };
  }
});
</script>
