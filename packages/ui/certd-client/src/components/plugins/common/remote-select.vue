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
const getOptions = async () => {
  return await doRequest({
    type: props.type,
    typeName: props.typeName,
    action: props.action,
    input: props.form
  });
};

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
  },
  { immediate: true }
);
</script>

<template>
  <a-select class="remote-select" :options="optionsRef" :value="value" @update:value="emit('update:value', $event)" />
</template>

<style lang="less"></style>
