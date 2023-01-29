<template>
  <fs-page>
    <template #header>
      <div class="title">本地分页</div>
    </template>
    <fs-crud v-if="crudBinding" ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert type="warning" class="ml-1" message="先从后台获取全部数据，然后本地分页展示" />
      </template>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud, useExpose } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { GetList } from "./api";

/**
 * 本示例演示如何本地分页
 * 主要就是将pageRequest修改为从本地获取数据就行了
 */
export default defineComponent({
  name: "AdvanceLocalPagination",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();

    const localDataRef = ref();

    onMounted(async () => {
      //先加载后台数据
      const ret = await GetList({ page: { offset: 0, limit: 99999999 }, query: {}, sort: {} });
      localDataRef.value = ret.records;

      //然后再初始化crud
      // 暴露的方法
      const { expose } = useExpose({ crudRef, crudBinding });
      // 你的crud配置
      const { crudOptions } = createCrudOptions({ expose, localDataRef });
      // 初始化crud配置
      useCrud({ expose, crudOptions });

      // 页面打开后获取列表数据
      await expose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
