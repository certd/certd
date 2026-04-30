<template>
  <div class="remote-input">
    <a-input v-bind="attrs" :value="modelValue" @update:value="onInputChange"></a-input>
    <fs-button class="ml-1" v-bind="button" :text="button?.text || title" @click="openDialog"></fs-button>
  </div>
</template>
<script setup lang="ts">
import { doRequest } from "/@/components/plugins/lib";
import { inject, ref, useAttrs } from "vue";
import { useI18n } from "vue-i18n";
import { useFormWrapper } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import { getInputFromForm } from "./utils";

defineOptions({
  name: "RemoteInput",
});
const { openCrudFormDialog } = useFormWrapper();
const { t } = useI18n();
const props = defineProps<{
  modelValue: string;
  title: string;
  action: string;
  form?: any;
  button?: any;
}>();

const emit = defineEmits<{
  "update:modelValue": any;
}>();

const getScope: any = inject("get:scope");
const getPluginType: any = inject("get:plugin:type", () => {
  return "plugin";
});

const attrs = useAttrs();

const loading = ref(false);

function onInputChange(value: string) {
  emit("update:modelValue", value);
}

async function openDialog() {
  function createCrudOptions() {
    return {
      crudOptions: {
        columns: {
          ...props.form.columns,
        },
        form: {
          wrapper: {
            title: props.title,
            saveRemind: false,
          },
          afterSubmit() {
            notification.success({ message: t("certd.operationSuccess") });
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

const doPluginFormSubmit = async (data: any) => {
  if (loading.value) {
    return;
  }

  loading.value = true;

  try {
    const pluginType = getPluginType();
    const { form } = getScope();
    const { input, record } = getInputFromForm(form, pluginType);
    const res = await doRequest({
      type: pluginType,
      typeName: form.type,
      action: props.action,
      input,
      data: data,
      record,
    });
    //获取返回值 填入到input中
    emit("update:modelValue", res);
    return res;
  } finally {
    loading.value = false;
  }
};
</script>
<style lang="less">
.remote-input {
  width: 100%;
  display: flex;
  align-items: center;
  .a-input {
    flex: 1;
  }
}
</style>
