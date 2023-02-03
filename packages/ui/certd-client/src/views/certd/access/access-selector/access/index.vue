<template>
  <fs-page class="page-cert-access-modal">
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, onMounted, ref, watch } from "vue";
import { useCrud, useExpose } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "CertAccessModal",
  props: {
    type: {
      type: String,
      default: "aliyun"
    },
    modelValue: {}
  },
  emits: ["update:modelValue"],
  setup(props, ctx) {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions, typeRef } = createCrudOptions({ expose, props, ctx });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ expose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    function onTypeChanged(value) {
      typeRef.value = value;
      expose.setSearchFormData({ form: { type: value }, mergeForm: true });
      expose.doRefresh();
    }
    watch(
      () => {
        return props.type;
      },
      (value) => {
        console.log("access type changed:", value);
        onTypeChanged(value);
      }
    );
    // 页面打开后获取列表数据
    onMounted(() => {
      onTypeChanged(props.type);
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
<style lang="less">
.page-cert-access {
}
</style>
