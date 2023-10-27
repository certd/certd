<template>
  <fs-page>
    <template #header>
      <div class="title">第一个crud</div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/start/first.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

//此处为组件定义
export default defineComponent({
  name: "FsCrudFirst",
  setup() {
    // // crud组件的ref
    // const crudRef: Ref = ref();
    // // crud 配置的ref
    // const crudBinding: Ref<CrudBinding> = ref();
    // // 暴露的方法
    // const { crudExpose } = useExpose({ crudRef, crudBinding });
    // // 你的crud配置
    // const { crudOptions, customExport } = createCrudOptions({ crudExpose, customValue });
    // // 初始化crud配置
    // const { resetCrudOptions, appendCrudBinding } = useCrud({ crudExpose, crudOptions });

    //  =======以上为fs的初始化代码=========
    //  =======你可以简写为下面这一行========
    const { crudRef, crudBinding, crudExpose, context } = useFs({ createCrudOptions, context: {} });

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
