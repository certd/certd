<template>
  <div class="valid-time-format">
    <a-tag v-if="isExpired" color="red">{{ prefix || "" }}已过期</a-tag>
    <a-tag v-if="isValid" color="green" :title="date">
      <fs-time-humanize v-if="humanize" :model-value="modelValue" :options="{ largest: 1, units: ['y', 'd', 'h'] }" :use-format-greater="30000000000" />
      <template v-else> {{ prefix || "" }}{{ date }} </template>
    </a-tag>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import dayjs from "dayjs";

const props = defineProps<{
  modelValue: number;
  humanize?: boolean;
  prefix?: string;
}>();

const date = computed(() => {
  return dayjs(props.modelValue || 0).format("YYYY-MM-DD");
});

const isValid = computed(() => {
  return props.modelValue > 0 && props.modelValue > new Date().getTime();
});

const isExpired = computed(() => {
  return props.modelValue > 0 && props.modelValue < new Date().getTime();
});
</script>
