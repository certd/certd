<template>
  <div class="api-test">
    <div>
      <fs-button :loading="loading" type="primary" text="测试" icon="ion:refresh-outline" @click="doTest"></fs-button>
    </div>

    <div class="helper" :class="{ error: hasError }">
      {{ message }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { ComponentPropsType, doRequest } from "/@/components/plugins/lib";
import { ref, inject } from "vue";
import { Form } from "ant-design-vue";
import { getInputFromForm } from "./utils";

defineOptions({
  name: "ApiTest",
});

const getScope: any = inject("get:scope");
const getPluginType: any = inject("get:plugin:type", () => {
  return "access";
});
const formItemContext = Form.useInjectFormItemContext();
const props = defineProps<{} & ComponentPropsType>();

const emit = defineEmits<{
  "update:value": any;
}>();

const message = ref("");
const hasError = ref(false);
const loading = ref(false);
const doTest = async () => {
  if (loading.value) {
    return;
  }

  formItemContext.onFieldChange();

  const { form } = getScope();
  const pluginType = getPluginType();

  message.value = "";
  hasError.value = false;
  loading.value = true;
  const { input, record } = getInputFromForm(form, pluginType);
  try {
    const res = await doRequest(
      {
        type: pluginType,
        typeName: form.type,
        action: props.action,
        input,
        record,
      },
      {
        onError(err: any) {
          hasError.value = true;
          message.value = `错误：${err.message}`;
        },
        showErrorNotify: false,
      }
    );
    message.value = "测试请求成功";
    if (res) {
      message.value += `，返回：${JSON.stringify(res)}`;
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="less"></style>
