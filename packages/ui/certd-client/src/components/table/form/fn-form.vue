<template>
  <a-form ref="formRef" class="fn-form" :model="formState" :label-col="labelCol" :wrapper-col="wrapperCol" v-bind="formProps">
    <a-row :gutter="gutter">
      <a-col v-for="column in formColumns" :key="column.key" :span="column.span ?? 12">
        <a-form-item v-if="column.show !== false" :label="column.title" :name="column.key" :rules="column.rules" v-bind="column.itemProps">
          <slot :name="column.key" :column="column" :form="formState" :value="formState[column.key]">
            <FnComponentRender v-if="column.component" v-bind="getComponentProps(column)" v-model:model-value="formState[column.key]" scope="form" />
            <a-input v-else v-model:value="formState[column.key]" />
          </slot>
          <div v-if="column.helper" class="fn-form-helper">{{ column.helper }}</div>
        </a-form-item>
      </a-col>
    </a-row>
  </a-form>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import FnComponentRender from "../components/fn-component-render";
import type { FnFormColumn, FnFormProps, FnFormContext } from "../types/index";

const props = withDefaults(
  defineProps<
    FnFormProps & {
      gutter?: number;
      onSave?: (form: Record<string, any>) => any;
    }
  >(),
  {
    initialForm: () => ({}),
    labelCol: () => ({ style: { width: "120px" } }),
    wrapperCol: () => ({ span: 16 }),
    gutter: 16,
    formProps: () => ({}),
    mode: "add",
    onSave: undefined,
  }
);
const emit = defineEmits<{
  save: [value: Record<string, any>];
}>();

const formRef = ref();
const mode = computed(() => props.mode || "add");
const initialValues = {
  ...Object.fromEntries(Object.entries(props.columns).map(([key, column]) => [key, column.value])),
  ...props.initialForm,
};
const formState = reactive({ ...initialValues });
const formColumns = computed(() =>
  Object.entries(props.columns)
    .map(([key, column]) => ({ ...column, key }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
);

function getComponentProps(column: FnFormColumn): Record<string, any> {
  const component = { ...(column.component || {}) };
  return component;
}

function getForm(): Record<string, any> {
  return formState;
}
function getContext(): FnFormContext {
  return {
    type: "form",
    form: formState,
    mode: mode.value,
    columns: props.columns,
    formRef: formRef.value,
    reset: () => {
      reset();
    },
    validate: async () => {
      await validate();
      return true;
    },
  };
}

function reset(): Record<string, any> {
  Object.keys(formState).forEach(key => delete formState[key]);
  Object.assign(formState, initialValues);
  formRef.value?.clearValidate();
  props.onReset?.(getContext());
  return getForm();
}

async function validate(): Promise<boolean> {
  await formRef.value.validate();
  return true;
}

async function save(): Promise<any> {
  await validate();
  const form = getForm();
  emit("save", form);
  if (props.onSubmit) {
    await props.onSubmit(getContext());
  }
  if (props.onSave) {
    return await props.onSave(form);
  }
  return form;
}

defineExpose({ save, reset, getForm, validate, formRef, getContext });
</script>

<style lang="less">
.fn-form {
  .ant-form-item {
    margin-bottom: 16px;
  }

  .fn-form-helper {
    margin-top: 4px;
    color: #98a2b1;
    font-size: 12px;
  }
}
</style>
