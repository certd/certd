<template>
  <a-tooltip :title="title">
    <div class="task-shortcut" :title="title" @click="openDialog">
      <fs-icon :icon="icon" v-bind="attrs"></fs-icon>
    </div>
  </a-tooltip>
</template>
<script setup lang="ts">
import { doRequest } from "/@/components/plugins/lib";
import { ref, useAttrs, inject } from "vue";
import { useFormWrapper } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import { mergeWith, isArray } from "lodash-es";
defineOptions({
  name: "TaskShortcut",
});
const { openCrudFormDialog } = useFormWrapper();
const props = defineProps<{
  icon: string;
  title: string;
  action: string;
  form: any;
  input: any;
  pluginName: string;
  stepId: string;
}>();

const attrs = useAttrs();

const loading = ref(false);

async function openDialog() {
  function createCrudOptions() {
    return {
      crudOptions: {
        columns: {
          ...props.form.columns,
          immediateRun: {
            title: "立即运行",
            type: "switch",
            span: 24,
            form: {
              value: true,
              component: {
                name: "a-switch",
                vModel: "checked",
              },
              helper: "保存后是否立即触发运行流水线",
            },
          },
        },
        form: {
          wrapper: {
            title: props.title,
            saveRemind: false,
          },
          afterSubmit() {
            notification.success({ message: "操作成功" });
          },
          async doSubmit({ form }: any) {
            return await doPluginFormSubmit(form);
          },
        },
      },
    };
  }
  const { crudOptions } = createCrudOptions();
  await openCrudFormDialog({ crudOptions });
}

const getPipelineScope: any = inject("getPipelineScope");
const doPluginFormSubmit = async (formData: any) => {
  if (loading.value) {
    return;
  }

  loading.value = true;
  try {
    const res = await doRequest({
      type: "plugin",
      typeName: props.pluginName,
      action: props.action,
      input: props.input,
      data: formData,
    });

    if (res.input) {
      const { save, findStep } = getPipelineScope();
      const step = findStep(props.stepId);
      if (step) {
        // 数组覆盖合并
        mergeWith(step.input, res.input, (objValue, srcValue) => {
          if (isArray(objValue)) {
            return srcValue;
          }
        });
        //保存，但不改变当前编辑状态
        save(false);
      }
    }

    if (formData.immediateRun) {
      const { run } = getPipelineScope();
      run();
    }

    return res;
  } finally {
    loading.value = false;
  }
};
</script>
<style lang="less">
.task-shortcut {
  width: 25px;
  height: 22px;
  border: 1px solid #e3e3e3;
  border-radius: 0 0 5px 5px;
  background: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border-top: 0;
  &:hover {
    background: #fff;
    border-color: #38a0fb;
  }
}
</style>
