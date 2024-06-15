<template>
  <fs-page class="page-first">
    <template #header>
      <div class="title">Ts定义测试</div>
      <div class="more"></div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import { useFs, utils } from "@fast-crud/fast-crud";
import createCrudOptions, { TsTestContext } from "./crud";
import { TsTestRow } from "./api";

//此处为组件定义
export default defineComponent({
  name: "FsCrudTsTest",
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
    const { crudRef, crudBinding, crudExpose, context } = useFs<TsTestRow, TsTestContext>({ createCrudOptions, context: {} });

    utils.logger.info("test", context.test);
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
