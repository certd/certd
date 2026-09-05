<template>
  <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";

defineOptions({
  name: "ProductManager",
});
const emit = defineEmits(["refreshed"]);

const context: any = { emit };
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

// 页面打开后获取列表数据
useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
