<template>
  <span class="fn-icon">
    <component :is="icon" :size="size" />
  </span>
</template>

<script setup lang="ts">
import type { FnIconProps } from "./types";

withDefaults(defineProps<FnIconProps>(), { size: 16 });
</script>

<style lang="less">
.fn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
