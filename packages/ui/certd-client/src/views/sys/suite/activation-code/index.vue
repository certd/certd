<template>
  <fs-page>
    <template #header>
      <div class="title">
        激活码管理
        <span class="sub">生成、禁用和查询套餐激活码</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { onActivated, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

defineOptions({
  name: "SysProductActivationCode",
});

const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

onMounted(() => {
  // crudExpose.doRefresh();
});
onActivated(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
