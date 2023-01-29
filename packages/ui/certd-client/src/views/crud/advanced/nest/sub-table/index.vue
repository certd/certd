<template>
  <div>
    <div>年级id：{{ gradeId }},当前选中值：{{ modelValue }}</div>
    <div style="height: 400px">
      <fs-crud ref="crudRef" v-bind="crudBinding" />
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, watch } from "vue";
import createCrudOptions from "./crud";
import { useExpose, useCrud } from "@fast-crud/fast-crud";
export default defineComponent({
  name: "SubTable",
  props: {
    modelValue: {},
    gradeId: {} //年级id，接收其他参数
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
    const { crudOptions } = createCrudOptions({ expose, props, ctx });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ expose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    onMounted(() => {
      expose.doRefresh();
    });

    //你的业务代码
    watch(
      () => {
        return props.modelValue;
      },
      (value) => {
        console.log("modelValue changed", value);
      }
    );
    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
<style lang="less" scoped>
/deep/.fs-crud-container.compact .el-table--border {
  border-left: 1px solid #eee;
}
</style>
