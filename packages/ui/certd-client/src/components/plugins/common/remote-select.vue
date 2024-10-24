<template>
  <div class="remote-select">
    <div class="flex flex-row">
      <a-select
        class="remote-select-input"
        show-search
        :filter-option="filterOption"
        :options="optionsRef"
        :value="value"
        v-bind="attrs"
        @click="onClick"
        @update:value="emit('update:value', $event)"
      />
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
import { ref, useAttrs, watch } from "vue";

defineOptions({
  name: "RemoteSelect"
});

const props = defineProps<
  {
    watches: string[];
  } & ComponentPropsType
>();

const emit = defineEmits<{
  "update:value": any;
}>();

const attrs = useAttrs();

const optionsRef = ref([]);
const message = ref("");
const hasError = ref(false);
const loading = ref(false);
const getOptions = async () => {
  message.value = "";
  hasError.value = false;
  loading.value = true;
  try {
    const res = await doRequest(
      {
        type: props.type,
        typeName: props.typeName,
        action: props.action,
        input: props.form
      },
      {
        onError(err: any) {
          hasError.value = true;
          message.value = `获取选项出错：${err.message}`;
        },
        showErrorNotify: false
      }
    );
    if (res && res.length > 0) {
      message.value = "获取数据成功，请从下拉框中选择";
    }
    return res;
  } finally {
    loading.value = false;
  }
};

const filterOption = (input: string, option: any) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0 || String(option.value).toLowerCase().indexOf(input.toLowerCase());
};

let isFirst = true;
async function onClick() {
  if (!isFirst) {
    return;
  }
  isFirst = false;
  await refreshOptions();
}

async function refreshOptions() {
  optionsRef.value = await getOptions();
}

watch(
  () => {
    const values = [];
    for (const item of props.watches) {
      values.push(props.form[item]);
    }
    return {
      form: props.form,
      watched: values
    };
  },
  async () => {
    optionsRef.value = await getOptions();
  }
);
</script>

<style lang="less"></style>
