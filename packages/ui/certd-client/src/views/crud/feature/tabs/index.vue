<template>
  <fs-page>
    <template #header>
      <div class="title">
        Tabs快捷查询
        <span class="sub">表格顶部显示tabs，点击tabs快捷查询</span>
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/api/crud-options/tabs.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useCrud } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useExpose } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
export default defineComponent({
  name: "FeatureTabs",
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
      getSearchFormData() {
        const form = expose.getSearchFormData();
        message.info(`searchForm:${JSON.stringify(form)}`);
      },
      setSearchFormData() {
        expose.setSearchFormData({ form: { radio: "1" }, mergeForm: true });
      },
      clearSearchForm() {
        expose.setSearchFormData({ form: { radio: null }, mergeForm: false });
      }
    };
  }
});
</script>
