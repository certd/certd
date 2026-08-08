<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">我的订单</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";

defineOptions({
  name: "MyTrade",
});
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

// 页面打开后获取列表数据
useMounted(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
