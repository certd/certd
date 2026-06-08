<template>
  <fs-page class="page-cert-apply-template">
    <template #header>
      <div class="title">
        证书申请参数模版
        <span class="sub">预设证书申请参数，不包含域名和校验方式</span>
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
