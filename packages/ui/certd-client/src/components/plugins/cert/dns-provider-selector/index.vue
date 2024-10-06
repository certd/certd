<template>
  <a-select class="dns-provider-selector" :value="modelValue" :options="options" @update:value="onChanged"> </a-select>
</template>

<script lang="ts">
import { ref } from "vue";
import * as api from "./api";

export default {
  name: "DnsProviderSelector",
  props: {
    modelValue: {
      type: String,
      default: undefined
    }
  },
  emits: ["update:modelValue"],
  setup(props: any, ctx: any) {
    const options = ref<any[]>([]);

    async function onCreate() {
      const list = await api.GetList();
      const array: any[] = [];
      for (let item of list) {
        array.push({
          value: item.name,
          label: item.title
        });
      }
      options.value = array;
      if (props.modelValue == null && options.value.length > 0) {
        ctx.emit("update:modelValue", options.value[0].value);
      }
    }
    onCreate();

    function onChanged(value: any) {
      ctx.emit("update:modelValue", value);
    }
    return {
      options,
      onChanged
    };
  }
};
</script>

<style lang="less"></style>
