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

<script>
import { defineComponent, ref, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useExpose, useCrud } from "@fast-crud/fast-crud";
import AsideTable from "./aside-table/index.vue";
export default defineComponent({
  name: "FeatureNest",
  // eslint-disable-next-line vue/no-unused-components
  components: { AsideTable },
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const asideTableRef = ref();
    const { crudOptions } = createCrudOptions({ expose, asideTableRef });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ expose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    onMounted(() => {
      expose.doRefresh();
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
