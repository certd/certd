<template>
  <a-tooltip title="点击我自增">
    <a-tag :color="color" @click="onClick">
      <!-- 插槽示例 -->
      <slot></slot>
      <span> {{ modelValue }}</span>
    </a-tag>
  </a-tooltip>
</template>

<script lang="ts">
import { defineComponent, watch } from "vue";

export default defineComponent({
  name: "VmodelCounter",
  props: {
    modelValue: {
      type: Number,
      default: 0
    },
    color: {
      type: String,
      default: "success"
    }
  },
  emits: ["update:modelValue", "change"],
  setup(props, ctx) {
    function onClick() {
      //发射modelValue更新事件，父组件引用时只需要v-model={xxx}即可
      ctx.emit("update:modelValue", props.modelValue + 1);
    }
    watch(
      () => {
        return props.modelValue;
      },
      (value) => {
        ctx.emit("change", value);
      }
    );
    return {
      onClick
    };
  }
});
</script>
