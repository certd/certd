<template>
  <fs-page>
    <template #header>
      <div class="title">CrudOptions从后台加载</div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/api/use.html#usefsasync">文档</a>
      </div>
    </template>
    <fs-crud v-if="crudBinding" ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, Ref } from "vue";
import { CrudBinding, useFsAsync } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "AdvancedFromBackend",
  setup() {
    // crud组件的ref
    const crudRef: Ref = ref();
    // crud 配置的ref
    const crudBinding: Ref<CrudBinding> = ref();

    const customValue: any = {}; //自定义变量，传给createCrudOptions的额外参数

    // 初始化crud配置
    // 页面打开后获取列表数据
    onMounted(async () => {
      const customValue = {};
      //异步初始化fs，createCrudOptions为异步方法
      const { crudExpose, context } = await useFsAsync({ crudRef, crudBinding, createCrudOptions, context: customValue });
      // 刷新数据
      await crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
