<template>
  <fs-page>
    <template #header>
      <div class="title">
        字段列排序
        <span class="sub">表格列和表单字段可以单独配置顺序，配置order即可控制字段的顺序，数字越小越靠前，默认为1，（配置0或负数排前面，配置2以上排后面）</span>
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/api/crud-options/columns.html#key-column-order">列顺序配置</a> /
        <a target="_blank" href="http://fast-crud.docmirror.cn/api/crud-options/columns.html#key-form-order">表单字段顺序配置</a>
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
  name: "FeatureColumnSort",
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
