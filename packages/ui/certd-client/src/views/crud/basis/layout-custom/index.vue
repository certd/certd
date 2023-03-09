<template>
  <fs-page class="page-layout-custom">
    <template #header>
      <div class="title">
        自定义布局
        <span class="sub">通过自定义container.is可以自定义布局，甚至可以支持上下两个翻页条</span>
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/advance/layout.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useExpose } from "@fast-crud/fast-crud";
export default defineComponent({
  name: "BasisLayoutCustom",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { crudExpose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions } = createCrudOptions({ crudExpose });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ crudExpose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

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
.page-layout-custom {
}
</style>
