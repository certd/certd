<template>
  <div class="remote-select">
    <div class="flex flex-row">
      <a-tree-select class="remote-tree-select-input" :tree-data="optionsRef" :value="value" tree-checkable allow-clear v-bind="attrs" @click="onClick" @update:value="emit('update:value', $event)"> </a-tree-select>
      <div class="ml-5">
        <fs-button :loading="loading" title="刷新选项" icon="ion:refresh-outline" @click="refreshOptions"></fs-button>
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
import { PluginDefine } from "@certd/pipeline";
import { getInputFromForm } from "./utils";

defineOptions({
  name: "RemoteTreeSelect",
});

const props = defineProps<
  {
    watches: string[];
    search?: boolean;
    pager?: boolean;
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

const searchKeyRef = ref("");
const optionsRef = ref([]);
const message = ref("");
const hasError = ref(false);
const loading = ref(false);
const pagerRef: Ref = ref({
  current: 1,
});
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
        console.log("remote-select required", key);
        return;
      }
    }
  }

  message.value = "";
  hasError.value = false;
  loading.value = true;
  const pageNo = pagerRef.value.pageNo;
  const pageSize = pagerRef.value.pageSize;
  try {
    const res = await doRequest(
      {
        type: pluginType,
        typeName: form.type,
        action: props.action,
        input,
        data: {
          searchKey: props.search ? searchKeyRef.value : "",
          pageNo,
          pageSize,
        },
        record,
      },
      {
        onError(err: any) {
          hasError.value = true;
          message.value = `获取选项出错：${err.message}`;
        },
        showErrorNotify: false,
      }
    );
    const list = res?.list || res || [];
    if (list.length > 0) {
      message.value = "获取数据成功，请从下拉框中选择";
    } else {
      message.value = "获取数据成功，没有数据";
    }
    optionsRef.value = list;
    pagerRef.value.total = list.length;
    if (props.pager) {
      if (res.pageNo != null) {
        pagerRef.value.pageNo = res.pageNo ?? 1;
      }
      if (res.pageSize != null) {
        pagerRef.value.pageSize = res.pageSize ?? 100;
      }
      if (res.total != null) {
        pagerRef.value.total = res.total ?? list.length;
      }
    }

    return res;
  } finally {
    loading.value = false;
  }
};

async function onClick() {
  if (optionsRef.value?.length === 0) {
    await refreshOptions();
  }
}

async function refreshOptions() {
  await getOptions();
}

async function doSearch() {
  pagerRef.value.pageNo = 1;
  await refreshOptions();
}

watch(
  () => {
    const pluginType = getPluginType();
    const { form, key } = getScope();
    const input = (pluginType === "plugin" ? form?.input : form) || {};
    const watches = {};
    for (const key of props.watches) {
      //@ts-ignore
      watches[key] = input[key];
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

async function onPageChange(current: any) {
  await refreshOptions();
}
</script>

<style lang="less"></style>
