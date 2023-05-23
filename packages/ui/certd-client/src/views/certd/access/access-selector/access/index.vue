<template>
  <fs-page class="page-cert-access-modal">
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, watch } from "vue";
import { useFs } from "@fast-crud/fast-crud";
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
    const context: any = { props, ctx };
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

    // 你可以调用此方法，重新初始化crud配置
    function onTypeChanged(value: any) {
      context.typeRef.value = value;
      crudExpose.setSearchFormData({ form: { type: value }, mergeForm: true });
      crudExpose.doRefresh();
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
