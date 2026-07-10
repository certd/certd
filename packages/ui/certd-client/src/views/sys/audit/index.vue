<template>
  <fs-page>
    <template #header>
      <div class="title">
        操作日志
        <span class="sub">查看所有用户的操作记录</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts" setup>
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { createSysAuditApi } from "./api";
import { useMounted } from "/@/use/use-mounted";

defineOptions({ name: "SysAuditLog" });

const api = createSysAuditApi();
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { api } });
useMounted(() => crudExpose.doRefresh());
</script>
