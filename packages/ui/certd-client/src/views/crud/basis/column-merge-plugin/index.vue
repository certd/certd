<template>
  <fs-page>
    <template #header>
      <div class="title">可以实现类似dict的公共属性</div>
      <div class="more"><a target="_blank" href="http://fast-crud.docmirror.cn/guide/advance/column-type.html#修改官方字段类型配置"> 字段合并插件帮助文档</a></div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <span class="fs-desc">此示例实现只需配置readonly: true，即可关闭添加和编辑时该字段的显示，更多说明请点击右上角帮助</span>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useFs, UseFsProps } from "@fast-crud/fast-crud";
export default defineComponent({
  name: "BasisColumnMergePlugin",
  setup() {
    const context: any = {}; //自定义变量，传给createCrudOptions的额外参数（可以任意命名，任意多个）
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });
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
