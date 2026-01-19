<template>
  <icon-select class="dns-provider-selector" :value="modelValue" :options="options" @update:value="atChange"> </icon-select>
</template>

<script lang="ts">
import { ref } from "vue";
import * as api from "./api";

export default {
  name: "DnsProviderSelector",
  props: {
    modelValue: {
      type: String,
      default: undefined,
    },
  },
  emits: ["update:modelValue", "selected-change"],
  setup(props: any, ctx: any) {
    const options = ref<any[]>([]);

    async function onCreate() {
      const list = await api.GetList();
      const array: any[] = [];
      for (let item of list) {
        array.push({
          value: item.name,
          label: item.title,
          icon: item.icon,
          accessType: item.accessType,
        });
      }
      options.value = array;
      // if (props.modelValue == null && options.value.length > 0) {
      //   ctx.emit("update:modelValue", options.value[0].value);
      // }
      onSelectedChange(props.modelValue);
    }
    onCreate();

    function atChange(value: any) {
      ctx.emit("update:modelValue", value);
      onSelectedChange(value);
    }
    function onSelectedChange(value: any) {
      if (value) {
        const option = options.value.find(item => item.value == value);
        if (option) {
          ctx.emit("selected-change", option);
          return;
        }
      }
    }
    return {
      options,
      atChange,
    };
  },
};
</script>

<style lang="less"></style>
