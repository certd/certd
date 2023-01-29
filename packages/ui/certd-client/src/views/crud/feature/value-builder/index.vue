<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #cell_roles="scope">
        <!-- 后台返回的列表数据已经包含了角色的名称，所以无需通过fs-values-format来从dict里获取label-->
        <template v-if="scope.value">
          <a-tag v-for="item of scope.value"> {{ item.name }}</a-tag>
        </template>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useExpose, useCrud } from "@fast-crud/fast-crud";
export default defineComponent({
  name: "FeatureValueBuilder",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions, selectedIds } = createCrudOptions({ expose });
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
      crudRef
    };
  }
});
</script>
