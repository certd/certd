<template>
  <fs-crud v-if="crudBinding" ref="crudRef" v-bind="crudBinding" />
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud, dict, useExpose } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { GetCrud } from "./api";
import _ from "lodash-es";
export default defineComponent({
  name: "AdvancedFromBackend",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions } = createCrudOptions({ expose });
    // 初始化crud配置
    // 页面打开后获取列表数据
    onMounted(async () => {
      // 从后台获取crud配置
      const ret = await GetCrud();
      // 编译
      const crudBackend = eval(ret);
      // 本示例返回的是一个方法字符串，所以要先执行这个方法，获取options
      const crudOptionsFromBackend = crudBackend({ expose, dict });
      // 与本地options合并
      _.merge(crudOptions, crudOptionsFromBackend);
      // useCrud
      useCrud({ expose, crudOptions });
      // 刷新数据
      expose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
