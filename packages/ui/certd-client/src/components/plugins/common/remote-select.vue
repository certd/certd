<script setup lang="ts">
import { ComponentPropsType, doRequest } from "/@/components/plugins/lib";
import { ref, watch } from "vue";

const props = defineProps<
  {
    watches: string[];
  } & ComponentPropsType
>();

const emit = defineEmits<{
  "update:value": any;
}>();

const optionsRef = ref([]);
const message = ref("");
const getOptions = async () => {
  return await doRequest(
    {
      type: props.type,
      typeName: props.typeName,
      action: props.action,
      input: props.form
    },
    {
      onError(err) {
        message.value = err.message;
      }
    }
  );
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

<template>
  <div>
    <a-select
    class="remote-select"
    show-search
    :filter-option="filterOption"
    :options="optionsRef"
    :value="value"
    @click="onClick"
    @update:value="emit('update:value', $event)"
  />
    <div class="helper">
      {{ message }}
    </div>
  </div>
</template>

<style lang="less"></style>
