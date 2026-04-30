<template>
  <div class="remote-auto-complete">
    <div class="flex flex-row">
      <a-auto-complete class="remote-auto-complete-input" :filter-option="filterOption" :options="optionsRef" :value="value" v-bind="attrs" @click="onClick" @update:value="emit('update:value', $event)">
      </a-auto-complete>
      <div class="ml-5">
        <fs-button :loading="loading" :title="t('certd.pluginCommon.refreshOptions')" icon="ion:refresh-outline" @click="refreshOptions"></fs-button>
      </div>
    </div>
    <div class="helper" :class="{ error: hasError }">
      {{ message }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { ComponentPropsType, doRequest } from "/@/components/plugins/lib";
import { defineComponent, inject, ref, useAttrs, watch, Ref } from "vue";
import { useI18n } from "vue-i18n";
import { PluginDefine } from "@certd/pipeline";
import { getInputFromForm } from "./utils";

defineOptions({
  name: "RemoteAutoComplete",
});

const { t } = useI18n();

const props = defineProps<
  {
    watches?: string[];
  } & ComponentPropsType
>();

const emit = defineEmits<{
  "update:value": any;
}>();

const attrs = useAttrs();

const getCurrentPluginDefine: any = inject("getCurrentPluginDefine", () => {
  return {};
});
const getScope: any = inject("get:scope", () => {
  return {};
});
const getPluginType: any = inject("get:plugin:type", () => {
  return "plugin";
});

const optionsRef = ref([]);
const message = ref("");
const hasError = ref(false);
const loading = ref(false);

const getOptions = async () => {
  if (loading.value) {
    return;
  }

  if (!getCurrentPluginDefine) {
    return;
  }

  const define: PluginDefine = getCurrentPluginDefine()?.value;
  if (!define) {
    return;
  }
  const pluginType = getPluginType();
  const { form } = getScope();
  const { input, record } = getInputFromForm(form, pluginType);
  for (let key in define.input) {
    const inWatches = props.watches?.includes(key);
    const inputDefine = define.input[key];
    if (inWatches && inputDefine.required) {
      const value = input[key];
      if (value == null || value === "") {
        console.log("remote-auto-complete required", key);
        return;
      }
    }
  }

  message.value = "";
  hasError.value = false;
  loading.value = true;
  try {
    const res = await doRequest(
      {
        type: pluginType,
        typeName: form.type,
        action: props.action,
        input,
        data: {},
        record,
      },
      {
        onError(err: any) {
          hasError.value = true;
          message.value = t("certd.pluginCommon.getOptionsError", { message: err.message });
        },
        showErrorNotify: false,
      }
    );
    const list = res?.list || res || [];
    if (list.length > 0) {
      message.value = t("certd.pluginCommon.getDataSuccessSelect");
    } else {
      message.value = t("certd.pluginCommon.getDataSuccessEmpty");
    }
    optionsRef.value = list;

    return res;
  } finally {
    loading.value = false;
  }
};

const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 || String(option.value).toLowerCase().indexOf(input.toLowerCase());
};

async function onClick() {
  if (optionsRef.value?.length === 0) {
    await refreshOptions();
  }
}

async function refreshOptions() {
  await getOptions();
}

watch(
  () => {
    const pluginType = getPluginType();
    const { form, key } = getScope();
    const { input, record } = getInputFromForm(form, pluginType);
    const watches: any = {};
    if (props.watches && props.watches.length > 0) {
      for (const key of props.watches) {
        watches[key] = input[key];
      }
    }

    return {
      form: watches,
      key,
    };
  },
  async (value, oldValue) => {
    const { form } = value;
    const oldForm: any = oldValue?.form;
    let changed = oldForm == null || optionsRef.value.length == 0;
    if (!props.watches || props.watches.length === 0) {
      return;
    }
    for (const key of props.watches) {
      //@ts-ignore
      if (oldForm && form[key] != oldForm[key]) {
        changed = true;
        break;
      }
    }
    if (changed) {
      await getOptions();
    }
  },
  {
    immediate: true,
  }
);
</script>

<style lang="less"></style>
