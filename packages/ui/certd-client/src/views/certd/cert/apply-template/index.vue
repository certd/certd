<template>
  <fs-page class="page-cert-apply-template">
    <template #header>
      <div class="title">
        {{ t("certd.navigation.certApplyTemplate") }}
        <span class="sub">{{ t("certd.navigation.certApplyTemplateHelper") }}</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useMounted } from "/@/use/use-mounted";
import { useI18n } from "/src/locales";

const { t } = useI18n();

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
