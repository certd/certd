<template>
  <a-pagination v-if="show !== false" v-bind="paginationProps" @change="changePage" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { FnPaginationProps } from "./types";

const props = withDefaults(defineProps<FnPaginationProps>(), {
  show: true,
  current: 1,
  pageSize: 10,
  pageSizeOptions: () => ["10", "20", "50", "100"],
  simple: false,
  showSizeChanger: true,
  showQuickJumper: false,
  showTotal: (total: number) => `共 ${total} 条`,
});
const emit = defineEmits<{ change: [current: number, pageSize: number] }>();

const paginationProps = computed(() => ({
  current: props.current,
  pageSize: props.pageSize,
  pageSizeOptions: props.pageSizeOptions,
  simple: props.simple,
  showSizeChanger: props.showSizeChanger,
  showQuickJumper: props.showQuickJumper,
  total: props.total,
  showTotal: props.showTotal,
  size: "small",
}));

function changePage(current: number, pageSize: number): void {
  emit("change", current, pageSize);
}
</script>
