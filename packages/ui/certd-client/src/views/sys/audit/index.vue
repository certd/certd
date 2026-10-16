<template>
  <fs-page>
    <template #header>
      <div class="title">
        {{ t("certd.navigation.sysResources.auditLog") }}
        <span class="sub">{{ t("certd.navigation.sysResources.auditLogHelper") }}</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import { useI18n } from "/src/locales";
import createCrudOptions from "./crud";
import { createSysAuditApi } from "./api";
import { useMounted } from "/@/use/use-mounted";

defineOptions({ name: "SysAuditLog" });

const api = createSysAuditApi();
const { t } = useI18n();
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { api } });
useMounted(() => crudExpose.doRefresh());
</script>
