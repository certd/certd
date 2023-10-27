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

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useCrud, useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useExpose } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
export default defineComponent({
  name: "FeatureSearch",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef,
      getSearchFormData() {
        const form = crudExpose.getSearchFormData();
        message.info(`searchForm:${JSON.stringify(form)}`);
      },
      setSearchFormData() {
        crudExpose.setSearchFormData({ form: { radio: "1" }, mergeForm: true });
      },
      clearSearchForm() {
        crudExpose.setSearchFormData({ form: { radio: null }, mergeForm: false });
      }
    };
  }
});
</script>
