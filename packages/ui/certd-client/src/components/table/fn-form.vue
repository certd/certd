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
import { computed, reactive, ref, watch } from "vue";
import FnComponentRender from "./fn-component-render";
import { resolveComputedValue } from "./compute";
import type { FnFormColumn, FnFormProps, FnFormContext } from "./types";

const props = withDefaults(
  defineProps<
    FnFormProps & {
      modelValue?: Record<string, any>;
      gutter?: number;
      onSave?: (form: Record<string, any>) => any;
    }
  >(),
  {
    modelValue: () => ({}),
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
  "update:modelValue": [value: Record<string, any>];
  save: [value: Record<string, any>];
}>();

const formRef = ref();
const mode = computed(() => props.mode || "add");
const initialValues = {
  ...Object.fromEntries(Object.entries(props.columns).map(([key, column]) => [key, column.value])),
  ...props.initialForm,
  ...props.modelValue,
};
const formState = reactive({ ...initialValues });
const formColumns = computed(() =>
  Object.entries(props.columns)
    .map(([key, column]) => ({ ...resolveColumn(column, key), key }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
);

function resolveColumn(column: FnFormColumn, key: string) {
  const formColumn = { ...column, search: undefined, cell: undefined };
  return resolveComputedValue(formColumn, {
    type: "form",
    form: formState,
    formRef: formRef.value,
    mode: mode.value,
    columns: props.columns,
    row: undefined,
    search: undefined,
    index: undefined,
    getComponentRef: undefined,
    field: key,
  });
}

watch(
  () => props.modelValue,
  value => Object.assign(formState, value || {})
);
watch(formState, value => emit("update:modelValue", { ...value }), { deep: true });

function getComponentProps(column: FnFormColumn) {
  const component = { ...(column.component || {}) };
  return component;
}

function getForm() {
  return { ...formState };
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

function reset() {
  Object.keys(formState).forEach(key => delete formState[key]);
  Object.assign(formState, initialValues);
  formRef.value?.clearValidate();
  props.onReset?.(getContext());
  return getForm();
}

async function validate() {
  return await formRef.value.validate();
}

async function save() {
  const form = await validate();
  emit("save", form);
  if (props.onSubmit) {
    await props.onSubmit(getContext());
  }
  if (props.onSave) {
    return await props.onSave(form);
  }
  return form;
}

defineExpose({ save, reset, getForm, validate, formRef });
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
