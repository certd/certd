<template>
  <fs-page>
    <template #header>
      <div class="title">动态计算-更多测试</div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/advance/compute.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "BasisComputeMore",
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
