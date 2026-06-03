<template>
  <div class="refresh-input">
    <div class="refresh-input-line">
      <a-input v-if="type !== 'textarea'" class="refresh-input-control" :value="value" :placeholder="placeholder" :allow-clear="!disabled" :disabled="disabled" @update:value="emit('update:value', $event)"></a-input>
      <a-textarea v-else class="refresh-input-control" :value="value" :placeholder="placeholder" :rows="rows" :allow-clear="!disabled" :disabled="disabled" @update:value="emit('update:value', $event)"></a-textarea>
      <fs-button :loading="loading" :disabled="disabled" type="primary" :text="buttonText" :icon="icon" @click="doRefresh"></fs-button>
    </div>
    <div class="helper" :class="{ error: hasError }">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ComponentPropsType, doRequest } from "/@/components/plugins/lib";
import { computed, inject, ref } from "vue";
import { Form } from "ant-design-vue";
import { getInputFromForm } from "./utils";

defineOptions({
  name: "RefreshInput",
});

type RefreshInputProps = ComponentPropsType & {
  buttonText?: string;
  icon?: string;
  placeholder?: string;
  successMessage?: string;
  disabled?: boolean;
  type?: string;
  rows?: number;
};

const fromType: any = inject("getFromType");
const getScope: any = inject("get:scope");
const getPluginType: any = inject("get:plugin:type", () => {
  return "access";
});
const formItemContext = Form.useInjectFormItemContext();
const props = defineProps<RefreshInputProps>();
const emit = defineEmits<{
  "update:value": [value: string];
}>();

const loading = ref(false);
const message = ref("");
const hasError = ref(false);

const action = computed(() => props.action);
const buttonText = computed(() => props.buttonText || "刷新");
const icon = computed(() => props.icon || "ion:refresh-outline");
const placeholder = computed(() => props.placeholder || "");
const successMessage = computed(() => props.successMessage || "刷新成功，请保存配置");

const doRefresh = async () => {
  if (props.disabled) {
    return;
  }
  if (loading.value) {
    return;
  }
  if (!action.value) {
    hasError.value = true;
    message.value = "缺少刷新动作配置";
    return;
  }

  formItemContext.onFieldChange();

  const { form } = getScope();
  const pluginType = getPluginType();
  const { input, record } = getInputFromForm(form, pluginType);

  loading.value = true;
  message.value = "";
  hasError.value = false;
  try {
    const res = await doRequest(
      {
        type: pluginType,
        typeName: form.type,
        action: action.value,
        input,
        record,
        fromType,
      },
      {
        onError(err: any) {
          hasError.value = true;
          message.value = err.message;
        },
        showErrorNotify: false,
      }
    );
    emit("update:value", res);
    message.value = successMessage.value;
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="less" scoped>
.refresh-input-line {
  display: flex;
  gap: 8px;
  align-items: center;
}

.refresh-input-control {
  flex: 1;
}
</style>
