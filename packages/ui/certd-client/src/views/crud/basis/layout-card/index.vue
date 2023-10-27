<template>
  <fs-page class="page-layout-card">
    <template #header>
      <div class="title">Card布局</div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/advance/layout.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useFs } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "BasisLayoutCard",
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

<style lang="less">
.page-layout-card {
  background-color: #eee;

  .fs-page-header {
    background-color: #fff;
  }
}
</style>
