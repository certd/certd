<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="warning" message="操作列按钮支持tooltip（实际上所有buttons配置都支持tooltip）" />
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, Ref } from "vue";
import createCrudOptions from "./crud.jsx";
import { useExpose, useCrud, CrudBinding } from "@fast-crud/fast-crud";
import { message, Modal, notification } from "ant-design-vue";
export default defineComponent({
  name: "BasisRowHandle",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding: Ref<CrudBinding> = ref({});
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions, selectedRowKeys } = createCrudOptions({ expose });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ expose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    onMounted(() => {
      expose.doRefresh();
    });

    function columnsSetToggleMode() {
      crudBinding.value.toolbar.columnsFilter.mode =
        crudBinding.value.toolbar.columnsFilter.mode === "simple" ? "default" : "simple";
      message.info("当前列设置组件的模式为：" + crudBinding.value.toolbar.columnsFilter.mode);
    }

    return {
      crudBinding,
      crudRef,
      columnsSetToggleMode
    };
  }
});
</script>
