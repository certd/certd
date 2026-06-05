<template>
  <fs-page class="page-sys-invite-user-level">
    <template #header>
      <div class="title">用户推广等级</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts" setup>
import { useMounted } from "/@/use/use-mounted";
import { onActivated, onMounted } from "vue";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud-user-level";

defineOptions({ name: "SysInviteUserLevel" });

const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
useMounted(() => crudExpose.doRefresh());
</script>
