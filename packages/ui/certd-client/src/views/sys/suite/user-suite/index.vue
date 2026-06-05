<template>
  <fs-page>
    <template #header>
      <div class="title">
        用户套餐
        <span class="sub">管理用户的套餐</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useMounted } from "/@/use/use-mounted";
import { onActivated, onMounted } from "vue";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

defineOptions({
  name: "UserSuites",
});
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: {} });
useMounted(() => crudExpose.doRefresh());
</script>
