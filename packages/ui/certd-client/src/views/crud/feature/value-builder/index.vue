<template>
  <fs-page>
    <template #header>
      <div class="title">
        ValueBuilder & ValueResolve
        <span class="sub">后台返回的值与字段组件的modelValue类型不一致时，需要使用ValueBuilder & ValueResolve做转换</span>
      </div>
      <div class="more"><a target="_blank" href="http://fast-crud.docmirror.cn/api/crud-options/columns.html#valuebuilder与valueresolve">文档</a> /</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #cell_roles="scope">
        <!-- 后台返回的列表数据已经包含了角色的名称，所以无需通过fs-values-format来从dict里获取label-->
        <template v-if="scope.value">
          <a-tag v-for="item of scope.value"> {{ item.name }}</a-tag>
        </template>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useFs } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "FeatureValueBuilder",
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
