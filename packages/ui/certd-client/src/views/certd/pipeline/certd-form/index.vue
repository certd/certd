<template>
  <fs-form-wrapper v-if="formWrapperOptions" ref="formWrapperRef" />
</template>

<script lang="ts">
import { useColumns, useExpose } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud.jsx";
import { ref } from "vue";
import _ from "lodash-es";
import * as api from "../api.plugin";
import { PluginGroup, PluginGroups } from "/@/views/certd/pipeline/pipeline/type";
export default {
  name: "PiCertdForm",
  setup(props: any, ctx: any) {
    const formWrapperRef = ref();
    const formWrapperOptions = ref();
    const doSubmitRef = ref();
    async function buildFormOptions() {
      const pluginGroups: { [key: string]: PluginGroup } = await api.GetGroups({});
      const certPluginGroup = pluginGroups.cert;

      // 自定义表单配置
      const { buildFormOptions } = useColumns();
      //使用crudOptions结构来构建自定义表单配置
      let { crudOptions } = createCrudOptions(certPluginGroup, formWrapperRef);

      const formOptions = buildFormOptions(
        _.merge(crudOptions, {
          form: {
            doSubmit({ form }: any) {
              // 创建certd 的pipeline
              doSubmitRef.value({ form });
            }
          }
        }) as any
      );

      formWrapperOptions.value = formOptions;
    }
    buildFormOptions();
    function open(doSubmit: any) {
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
