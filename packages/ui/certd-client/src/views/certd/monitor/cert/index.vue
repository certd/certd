<template>
  <fs-page>
    <template #header>
      <div class="title">
        {{ t("certd.monitor.certificateRepo.title") }}
        <span class="sub">{{ t("certd.monitor.certificateRepo.sub") }}</span>
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
  name: "CertStore",
});
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { permission: { isProjectPermission: true } } });
useMounted(() => crudExpose.doRefresh());
</script>
