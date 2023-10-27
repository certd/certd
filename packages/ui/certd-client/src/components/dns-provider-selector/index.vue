<template>
  <a-select class="pi-dns-provider-selector" :value="modelValue" :options="options" @update:value="onChanged">
  </a-select>
</template>

<script lang="ts">
import { inject, Ref, ref, watch } from "vue";
import * as api from "./api";

export default {
  name: "PiDnsProviderSelector",
  props: {
    modelValue: {
      type: String,
      default: undefined
    }
  },
  emits: ["update:modelValue"],
  setup(props:any, ctx:any) {
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

    function onChanged(value:any) {
      ctx.emit("update:modelValue", value);
    }
    return {
      options,
      onChanged
    };
  }
};
</script>

<style lang="less">
.step-edit-form {
  .body {
    padding: 10px;
    .ant-card {
      margin-bottom: 10px;

      &.current {
        border-color: #00b7ff;
      }

      .ant-card-meta-title {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
      }

      .ant-avatar {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .title {
        margin-left: 5px;
        white-space: nowrap;
        flex: 1;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .ant-card-body {
      padding: 14px;
      height: 100px;

      overflow-y: hidden;

      .ant-card-meta-description {
        font-size: 10px;
        line-height: 20px;
        height: 40px;
        color: #7f7f7f;
      }
    }
  }
}
</style>
