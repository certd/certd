<template>
  <fs-page>
    <template #header>
      <div class="title">
        操作日志
        <span class="sub">查看您的操作记录</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { createAuditApi } from "./api";
import { useMounted } from "/@/use/use-mounted";

defineOptions({ name: "AuditLog" });

const api = createAuditApi();
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { api } });
useMounted(() => crudExpose.doRefresh());
</script>
