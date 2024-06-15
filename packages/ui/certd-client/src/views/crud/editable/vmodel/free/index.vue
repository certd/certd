<template>
  <div style="height: 500px; position: relative">
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, watch } from "vue";
import createCrudOptions from "./crud";
import { useFs, useUi, utils } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";

export default defineComponent({
  name: "EditableFreeSub",
  props: {
    modelValue: {
      type: Array,
      default() {
        return undefined;
      }
    },
    disabled: {
      type: Boolean,
      default: false
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  emits: ["update:modelValue"],
  setup(props, ctx) {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
    const { ui } = useUi();
    let formItemContext = ui.formItem.injectFormItemContext();

    function emit(data: any) {
      utils.logger.info("emit:", data);
      ctx.emit("update:modelValue", data);
      formItemContext.onBlur();
      formItemContext.onChange();
    }

    // 页面打开后获取列表数据
    onMounted(() => {
      // crudExpose.doRefresh();

      watch(
        () => {
          return props.modelValue;
        },
        (value: any) => {
          if (value != null) {
            crudBinding.value.data = value;
          } else {
            crudBinding.value.data = [];
            emit(crudBinding.value.data);
          }
        },
        {
          immediate: true
        }
      );

      watch(
        () => {
          return props.disabled || props.readonly;
        },
        (value) => {
          if (value) {
            crudBinding.value.table.editable.readonly = true;
            crudBinding.value.actionbar.buttons.addRow.show = false;
            crudBinding.value.rowHandle.show = false;
          } else {
            crudBinding.value.table.editable.readonly = false;
            crudBinding.value.actionbar.buttons.addRow.show = true;
            crudBinding.value.rowHandle.show = true;
          }
        },
        {
          immediate: true
        }
      );
      // crudExpose.editable.enable({ mode: "free", activeDefault: true });
    });

    async function validate() {
      //校验，在上级表单的beforeSubmit中调用
      return await crudExpose.getTableRef().editable.validate();
    }
    return {
      crudBinding,
      crudRef,
      validate
    };
  }
});
</script>
