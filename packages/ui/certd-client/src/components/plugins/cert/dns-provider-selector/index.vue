<template>
  <icon-select class="dns-provider-selector" :value="modelValue" :options="options" :filter-option="true" @update:value="atChange"> </icon-select>
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
  emits: ["update:modelValue", "selected-change", "change"],
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
      //这里需要一个第一次的selected-change事件，外部表单字段有情况会用到选中的option
      onSelectedChange(props.modelValue, true);
    }
    onCreate();

    function atChange(value: any) {
      ctx.emit("update:modelValue", value);
      onSelectedChange(value);
    }
    function onSelectedChange(value: any, isFirst: boolean = false) {
      if (value) {
        const option = options.value.find(item => item.value == value);
        if (!isFirst) {
          ctx.emit("change", value);
        }
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
