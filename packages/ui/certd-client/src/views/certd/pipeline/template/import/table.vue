<template>
  <fs-crud ref="crudRef" class="template-import-table" v-bind="crudBinding">
    <template #actionbar-right>
      <div class="helper ml-10">1. 点击添加按钮，添加一行记录； 2.输入流水线参数； 3. 点击右边“确认创建”，批量创建流水线。</div>
    </template>
  </fs-crud>
</template>

<script setup lang="tsx">
import { computed, onMounted, ref, Ref, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { templateApi } from "../api";
import { usePluginStore } from "/@/store/plugin";
import { useStepHelper } from "../utils";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { Form } from "ant-design-vue";

defineOptions({
  name: "TemplateImportTable",
});

const formItemContext = Form.useInjectFormItemContext();

type TemplateDetail = {
  template: any;
  pipeline: any;
};
const templateProps: Ref = ref({
  input: {},
});

const props = defineProps<{
  detail: TemplateDetail;
}>();

const pluginStore = usePluginStore();

const { getStepsMap } = useStepHelper(pluginStore);

function buildColumns(steps: any) {
  const columns: any = {
    title: {
      title: "流水线标题",
      type: "text",
      form: {
        component: {
          placeholder: "请输入流水线标题",
        },
        rules: [{ required: true, message: "请输入流水线标题" }],
      },
    },
  };
  for (const inputKey in templateProps.value.input) {
    const [stepId, key] = inputKey.split(".");
    const item = steps[stepId].input[key];
    columns[inputKey] = {
      title: item.define.title,
      type: "text",
      form: {
        ...item.define,
      },
      column: {},
    };
  }
  return {
    table: {
      slots: {
        headerCell({ column }: any) {
          const col = columns[column.key];
          if (col && col?.form?.helper) {
            return (
              <span class={"flex "}>
                {col.title}
                <a-tooltip title={col.form.helper}>
                  <fs-icon class={"ml-5"} icon={"ion:alert-circle-outline"}></fs-icon>
                </a-tooltip>
              </span>
            );
          }
        },
      },
    },
    columns,
  };
}

//启用行编辑模式
const { crudBinding, crudRef, crudExpose, appendCrudOptions } = useFs({ createCrudOptions, context: {} });
onMounted(async () => {
  await pluginStore.init();
  await nextTick();
  const steps = getStepsMap(props.detail.pipeline);
  if (props.detail.template?.content) {
    templateProps.value = JSON.parse(props.detail.template?.content);
  }

  appendCrudOptions({ ...buildColumns(steps) });
  crudBinding.value.data = [];
  await crudExpose.editable.enable({ mode: "row" });
});

defineExpose({
  getData() {
    return crudBinding.value.data;
  },
  clear() {
    crudBinding.value.data = [];
  },
});
</script>

<style lang="less">
.template-import-table {
  .ant-table-container {
    .ant-select {
      width: 100%;
    }
  }
}
</style>
