<template>
  <fs-page>
    <template #header>
      <div class="title">列设置（简化模式）</div>
      <div class="more"><a target="_blank" href="http://fast-crud.docmirror.cn/api/crud-options/toolbar.html#columnsfilter-mode">文档</a></div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="warning" message="列设置支持简化模式 ------> 点击最右侧按钮查看效果" />
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useFs } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "FeatureColumnsSet",
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
