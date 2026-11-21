<template>
  <div class="fn-toolbar">
    <FnButton
      type="default"
      :icon="density === 'compact' ? Rows3 : Rows2"
      :tooltip="density === 'compact' ? '当前紧凑模式，点击切换宽松' : '当前宽松模式，点击切换紧凑'"
      :disabled="disabled"
      @click="emit('toggle-density')"
    />
    <FnButton type="default" :icon="Columns3" tooltip="列设置" :disabled="disabled" @click="emit('open-column-settings')" />
  </div>
</template>

<script setup lang="ts">
import { Columns3, Rows2, Rows3 } from "@lucide/vue";
import FnButton from "./fn-button.vue";

defineProps<{ density: "compact" | "comfort"; disabled?: boolean }>();
const emit = defineEmits<{ "toggle-density": []; "open-column-settings": [] }>();
</script>

<style lang="less">
.fn-toolbar {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
}
</style>
