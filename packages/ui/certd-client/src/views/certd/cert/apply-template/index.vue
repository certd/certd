<template>
  <fs-page class="page-cert-apply-template">
    <template #header>
      <div class="title">
        Certificate Apply Parameter Templates
        <span class="sub">Preset certificate apply parameters, excluding domains and validation method</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";

defineOptions({
  name: "CertApplyTemplate",
});

const { crudBinding, crudRef, crudExpose } = useFs({
  createCrudOptions,
  context: {
    permission: { isProjectPermission: true },
  },
});
useMounted(() => crudExpose.doRefresh());
</script>
