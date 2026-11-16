<template>
  <input class="fn-input" :value="modelValue" :disabled="disabled" :placeholder="placeholder" :type="type" v-bind="$attrs" @input="handleInput" @blur="$emit('blur', $event)" />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue?: string | number; disabled?: boolean; placeholder?: string; type?: string }>(), { type: "text" });
const emit = defineEmits<{ "update:modelValue": [value: string]; blur: [event: FocusEvent] }>();

function handleInput(event: Event): void {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>

<style lang="less">
.fn-input {
  display: block;
  width: 100%;
  min-height: 32px;
  padding: 4px 10px;
  border: 1px solid #d0d5dd;
  border-radius: 5px;
  outline: none;
  color: #344054;
  background: #fff;
  font: inherit;

  &:focus {
    border-color: hsl(var(--primary, 212 100% 45%));
    box-shadow: 0 0 0 2px color-mix(in srgb, hsl(var(--primary, 212 100% 45%)) 18%, transparent);
  }

  &:disabled {
    color: #98a2b1;
    background: #f2f4f7;
    cursor: not-allowed;
  }

  .dark & {
    border-color: #424b59;
    color: #d8dee8;
    background: #232a34;
    &:disabled {
      background: #1b2028;
    }
  }
}
</style>
