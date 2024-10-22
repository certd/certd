<template>
  <a-input class="cd-input-password" :class="{ show: showRef }">
    <template #suffix>
      <fs-icon class="pointer" :icon="computedIcon" @click="showRef = !showRef" />
    </template>
  </a-input>
</template>
<script lang="ts" setup>
import { computed, ref } from "vue";

const showRef = ref(false);
const computedIcon = computed(() => {
  return showRef.value ? "ion:eye-outline" : "ion:eye-off-outline";
});
</script>
<style lang="less">
.cd-input-password {
  text-security: disc;
  -webkit-text-security: disc;
  .fs-iconify {
    font-size: 16px;
  }
  &.show {
    text-security: none;
    -webkit-text-security: none;
  }
}
</style>
