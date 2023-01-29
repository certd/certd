<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-button @click="showData">获取表格数据，打印data</a-button>
        <a-button @click="disabledEdit">退出编辑模式</a-button>
        <a-button @click="enabledFreeEdit">自由编辑模式</a-button>
        <a-button @click="enabledRowEdit">行编辑模式</a-button>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useExpose, useCrud } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "FeatureLocal",
  props: {
    modelValue: {}
  },
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
    // onMounted(() => {
    //   expose.doRefresh();
    // });

    // 通过crudBinding.value.data 可以获取表格实时数据
    function showData() {
      console.log("data:", crudBinding.value.data);
    }

    //初始化本地数据示例
    crudBinding.value.data = [{ name: "test" }];

    //启用行编辑
    function enabledRowEdit() {
      expose.editable.enable({
        mode: "row"
      });
      crudBinding.value.actionbar.buttons.add.show = false;
      crudBinding.value.actionbar.buttons.addRow.show = true;
    }

    //启用自由编辑
    function enabledFreeEdit() {
      expose.editable.enable({
        mode: "free"
      });
      crudBinding.value.actionbar.buttons.add.show = false;
      crudBinding.value.actionbar.buttons.addRow.show = true;
    }

    //启用关闭编辑模式
    function disabledEdit() {
      expose.editable.enable({
        enabled: false
      });
      crudBinding.value.actionbar.buttons.add.show = true;
      crudBinding.value.actionbar.buttons.addRow.show = false;
    }

    return {
      crudBinding,
      crudRef,
      showData,
      enabledRowEdit,
      enabledFreeEdit,
      disabledEdit
    };
  }
});
</script>
