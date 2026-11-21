<template>
  <form class="fn-form" v-bind="formProps" :style="formStyle" @submit.prevent="save">
    <div class="fn-form-grid" :style="{ gap: `${gutter}px` }">
      <div v-for="column in formColumns" :key="column.key" class="fn-form-column" :style="{ gridColumn: `span ${column.span ?? 12}` }">
        <FnFormItem v-if="column.show !== false" :label="column.title" :error="errors[column.key]" :help="column.helper" :html-for="column.key" v-bind="column.itemProps">
          <slot :name="column.key" :column="column" :form="formState" :value="formState[column.key]">
            <FnComponentRender v-if="column.component" v-bind="getComponentProps(column)" v-model:model-value="formState[column.key]" scope="form" :field-key="column.key" />
            <FnInput v-else :id="column.key" v-model="formState[column.key]" @update:model-value="validateField(column.key)" @blur="validateField(column.key)" />
          </slot>
        </FnFormItem>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, provide, reactive } from "vue";
import FnComponentRender from "../components/fn-component-render";
import FnInput from "../components/fn-input.vue";
import FnFormItem from "./fn-form-item.vue";
import { fnFormContextKey } from "./context";
import { validateFnFormField } from "./validation";
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
    gutter: 16,
    formProps: () => ({}),
    mode: "add",
    onSave: undefined,
  }
);
const emit = defineEmits<{
  save: [value: Record<string, any>];
}>();

const errors = reactive<Record<string, string>>({});
const formRef = {
  validate,
  clearValidate,
};
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
const formStyle = computed(() => ({ ...((props.formProps.style as Record<string, string>) || {}), "--fn-form-label-width": (props.labelCol?.style?.width as string) || "120px" }));

provide(fnFormContextKey, { validateField });

async function validateField(key: string): Promise<void> {
  const error = await validateFnFormField(key, props.columns[key], formState[key]);
  if (!error) {
    delete errors[key];
    return;
  }
  errors[key] = error;
}

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
    formRef,
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
  clearValidate();
  props.onReset?.(getContext());
  return getForm();
}

async function validate(): Promise<boolean> {
  const keys = formColumns.value.filter(column => column.show !== false).map(column => column.key);
  await Promise.all(keys.map(validateField));
  if (Object.keys(errors).length) {
    throw { errorFields: Object.entries(errors).map(([name, errors]) => ({ name, errors })) };
  }
  return true;
}

function clearValidate(): void {
  Object.keys(errors).forEach(key => delete errors[key]);
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
  .fn-form-grid {
    display: grid;
    grid-template-columns: repeat(24, minmax(0, 1fr));
  }

  .fn-form-column {
    min-width: 0;
  }

  @media (max-width: 720px) {
    .fn-form-grid {
      display: block;
    }
  }
}
</style>
