<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-button class="ml-1" @click="getSearchFormData">getSearchFormData</a-button>
        <a-button class="ml-1" @click="setSearchFormData">setSearchFormData</a-button>
        <a-button class="ml-1" @click="clearSearchForm">clearSearchForm</a-button>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useExpose } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
export default defineComponent({
  name: "FeatureSearch",
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
        expose.setSearchFormData({ form: { radio: "1", test: 2 }, mergeForm: true });
      },
      clearSearchForm() {
        expose.setSearchFormData({ form: {}, mergeForm: false });
      }
    };
  }
});
</script>
