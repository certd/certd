<template>
  <a-form ref="formRef" class="fn-form" :model="formState" :label-col="labelCol" :wrapper-col="wrapperCol" v-bind="formProps">
    <a-row :gutter="gutter">
      <a-col v-for="column in formColumns" :key="column.key" :span="column.span || 24">
        <a-form-item v-if="column.form?.show !== false" :label="column.form?.label || column.title" :name="column.key" :rules="column.form?.rules" v-bind="column.form?.itemProps">
          <slot :name="column.key" :column="column" :form="formState" :value="formState[column.key]">
            <FnComponentRender v-if="column.form?.component" v-bind="getComponentProps(column)" v-model:model-value="formState[column.key]" scope="form" />
            <a-input v-else v-model:value="formState[column.key]" />
          </slot>
        </a-form-item>
      </a-col>
    </a-row>
  </a-form>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import FnComponentRender from "./fn-component-render";

interface FnFormColumn {
  key?: string;
  title?: string;
  order?: number;
  span?: number;
  form?: {
    show?: boolean;
    label?: string;
    component?: Record<string, any>;
    rules?: any[];
    itemProps?: Record<string, any>;
    order?: number;
    value?: any;
    [key: string]: any;
  };
}

const props = withDefaults(
  defineProps<{
    columns: Record<string, FnFormColumn>;
    modelValue?: Record<string, any>;
    initialForm?: Record<string, any>;
    labelCol?: Record<string, any>;
    wrapperCol?: Record<string, any>;
    gutter?: number;
    formProps?: Record<string, any>;
    onSave?: (form: Record<string, any>) => any;
  }>(),
  {
    modelValue: () => ({}),
    initialForm: () => ({}),
    labelCol: () => ({ style: { width: "120px" } }),
    wrapperCol: () => ({ span: 16 }),
    gutter: 16,
    formProps: () => ({}),
    onSave: undefined,
  }
);
const emit = defineEmits<{
  "update:modelValue": [value: Record<string, any>];
  save: [value: Record<string, any>];
}>();

const formRef = ref();
const initialValues = {
  ...Object.fromEntries(Object.entries(props.columns).map(([key, column]) => [key, column.form?.value])),
  ...props.initialForm,
  ...props.modelValue,
};
const formState = reactive({ ...initialValues });
const formColumns = computed(() =>
  Object.entries(props.columns)
    .map(([key, column]) => ({ ...column, key }))
    .sort((left, right) => (left.form?.order ?? left.order ?? 0) - (right.form?.order ?? right.order ?? 0))
);

watch(
  () => props.modelValue,
  value => Object.assign(formState, value || {})
);
watch(formState, value => emit("update:modelValue", { ...value }), { deep: true });

function getComponentProps(column: FnFormColumn) {
  const component = { ...(column.form?.component || {}) };
  delete component.vModel;
  return component;
}

function getForm() {
  return { ...formState };
}

function reset() {
  Object.keys(formState).forEach(key => delete formState[key]);
  Object.assign(formState, initialValues);
  formRef.value?.clearValidate();
  return getForm();
}

async function validate() {
  return await formRef.value.validate();
}

async function save() {
  const form = await validate();
  emit("save", form);
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
}
</style>
