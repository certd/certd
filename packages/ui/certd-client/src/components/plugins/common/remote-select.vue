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
        <fs-button title="刷新选项" icon="ion:refresh-outline" @click="refreshOptions"></fs-button>
      </div>
    </div>
    <div class="helper error">
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
const getOptions = async () => {
  message.value = "";
  const res = await doRequest(
    {
      type: props.type,
      typeName: props.typeName,
      action: props.action,
      input: props.form
    },
    {
      onError(err: any) {
        message.value = `获取选项出错：${err.message}`;
      },
      showErrorNotify: false
    }
  );
  return res;
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
