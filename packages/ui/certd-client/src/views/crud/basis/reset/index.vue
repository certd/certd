<template>
  <fs-page>
    <template #header>
      <div class="title">
        重置CrudOptions
        <span class="sub">重置CrudOptions,演示2秒后追加一个字段</span>
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/api/use.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { CrudOptions, DynamicType, useFs, UseFsProps } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud.js";
import _ from "lodash-es";
export default defineComponent({
  name: "BasisReset",
  setup() {
    const { crudBinding, crudRef, crudExpose, context, crudOptions, resetCrudOptions, appendBindingOptions } = useFs({ createCrudOptions, context: {} });

    setTimeout(() => {
      //合并新的crudOptions
      const newOptions: DynamicType<CrudOptions> = _.merge(crudOptions, {
        columns: {
          text: {
            title: "追加字段",
            type: "text"
          }
        }
      });
      //重置crudBinding
      resetCrudOptions(newOptions);
      crudExpose.doRefresh();
    }, 2000);

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
