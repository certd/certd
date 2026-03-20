<template>
  <div class="remote-select">
    <div class="flex flex-row">
      <a-select ref="selectRef" class="remote-select-input" show-search :filter-option="filterOption" :options="optionsRef" :value="value" v-bind="attrs" @click="onClick" @update:value="updateValue($event)">
        <template #dropdownRender="{ menuNode: menu }">
          <template v-if="search">
            <div class="flex w-full" style="padding: 4px 8px">
              <a-input ref="inputRef" v-model:value="searchKeyRef" class="flex-1" allow-clear placeholder="查询关键字" @keydown.enter="doSearch" />
              <a-button class="ml-2" :loading="loading" type="text" @click="doSearch">
                <template #icon>
                  <search-outlined />
                </template>
                查询
              </a-button>
            </div>
            <div v-if="hasError" class="helper p-2" :class="{ error: hasError }">
              {{ message }}
            </div>
            <a-divider style="margin: 4px 0" />
          </template>
          <v-nodes :vnodes="menu" />

          <div v-if="pager === true" class="pager text-center p-5">
            <a-pagination v-model:current="pagerRef.pageNo" simple :total="pagerRef.total" :page-size="pagerRef.pageSize" @change="onPageChange" />
          </div>
        </template>
      </a-select>
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
  name: "RemoteSelect",
});

const selectRef = ref(null);

const VNodes = defineComponent({
  props: {
    vnodes: {
      type: Object,
      required: true,
    },
  },
  render() {
    return this.vnodes;
  },
});

const props = defineProps<
  {
    watches?: string[];
    search?: boolean;
    pager?: boolean;
    multi?: boolean;
    pageSize?: number;
  } & ComponentPropsType
>();

const emit = defineEmits<{
  "update:value": any;
}>();

function updateValue(value: any) {
  // if (props.multi !== false) {
  //   emit("update:value", value);
  // } else {
  //   const last = value?.[value.length - 1];
  //   emit("update:value", last);
  //   selectRef.value.blur();
  // }

  emit("update:value", value);
}

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
  pageNo: 1,
  total: 0,
  pageSize: props.pageSize || 50,
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
        record,
        data: {
          searchKey: props.search ? searchKeyRef.value : "",
          pageNo,
          pageSize,
        },
      },
      {
        onError(err: any) {
          hasError.value = true;
          message.value = `获取选项出错：${err.message}`;
          optionsRef.value = [];
        },
        showErrorNotify: false,
      }
    );
    let list = res?.list || res || [];
    if (list.length > 0) {
      message.value = "获取数据成功，请从下拉框中选择";
    } else {
      message.value = "获取数据成功，没有数据";
    }
    list = list.map((item: any) => {
      return {
        ...item,
        title: `${item.domain || item.value}`,
      };
    });
    optionsRef.value = list;
    pagerRef.value.total = list.length;
    if (props.pager) {
      if (res.pageNo != null) {
        pagerRef.value.pageNo = res.pageNo ?? 1;
      }
      if (res.pageSize != null) {
        pagerRef.value.pageSize = res.pageSize ?? pageSize;
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

const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().includes(input.toLowerCase()) || String(option.value).toLowerCase().includes(input.toLowerCase());
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
    if (props.watches && props.watches.length > 0) {
      for (const key of props.watches) {
        if (oldForm && form[key] != oldForm[key]) {
          changed = true;
          break;
        }
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
