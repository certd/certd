<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">
        {{ $t("certd.sys.settings.orderManager") }}
        <span class="sub"> </span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";

defineOptions({
  name: "OrderManager",
});
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

useMounted(() => crudExpose.doRefresh());
</script>
<style lang="less"></style>
