<template>
  <a-row class="demo-nest" :gutter="0">
    <a-col :span="12">
      <fs-crud ref="crudRef" v-bind="crudBinding">
        <template #actionbar-right>
          <a-alert type="warning" class="ml-1" message="<--对话框内嵌套子表格" />
        </template>
      </fs-crud>
    </a-col>
    <a-col :span="12">
      <aside-table ref="asideTableRef" />
    </a-col>
  </a-row>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import createCrudOptions from "./crud.js";
import AsideTable from "./aside-table/index.vue";
import { useFs } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "FeatureNest",
  // eslint-disable-next-line vue/no-unused-components
  components: { AsideTable },
  setup() {
    const asideTableRef = ref();

    const { crudBinding, crudRef, crudExpose, context } = useFs({ createCrudOptions, context: { asideTableRef } });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef,
      asideTableRef
    };
  }
});
</script>
<style lang="less">
.demo-nest {
  height: 100%;
  width: 100%;
}
</style>
