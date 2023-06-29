<template>
  <fs-form-wrapper ref="formWrapperRef" />
</template>

<script lang="ts">
import { useColumns, useExpose } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud.jsx";
import { ref } from "vue";
import _ from "lodash-es";
export default {
  name: "PiCertdForm",
  setup(props, ctx) {
    // 自定义表单配置
    const { buildFormOptions } = useColumns();
    //使用crudOptions结构来构建自定义表单配置
    let { crudOptions } = createCrudOptions();
    const doSubmitRef = ref();
    const formOptions = buildFormOptions(
      _.merge(crudOptions, {
        form: {
          doSubmit({ form }) {
            // 创建certd 的pipeline
            doSubmitRef.value({ form });
          }
        }
      })
    );

    const formWrapperRef = ref();
    const formWrapperOptions = ref();
    formWrapperOptions.value = formOptions;
    function open(doSubmit) {
      doSubmitRef.value = doSubmit;
      formWrapperRef.value.open(formWrapperOptions.value);
    }

    return {
      formWrapperRef,
      open,
      formWrapperOptions
    };
  }
};
</script>

<style scoped></style>
